"use client"

import { Button } from "@/components/ui/button"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { useChatMutation, useChatResetMutation } from "@/hooks/mutations/use-chat-mutation"
import { useChatHistoryQuery } from "@/hooks/queries/use-chat-query"
import type { ChatMessage } from "@/types/api/chat"
import { Loader2, RotateCcw, Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatPanelProps {
    projectId: string
}

export function ChatPanel({ projectId }: ChatPanelProps) {
    const [input, setInput] = useState("")
    const [resetModalOpen, setResetModalOpen] = useState(false)
    const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const { data: history } = useChatHistoryQuery(projectId)
    const chatMutation = useChatMutation()
    const resetMutation = useChatResetMutation()

    // 표시할 메시지: 서버 히스토리 + 낙관적 메시지
    const messages = [...(history ?? []), ...optimisticMessages]

    // 자동 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages.length])

    // textarea 높이 자동 조절
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
        }
    }

    const handleSend = async () => {
        const trimmed = input.trim()
        if (!trimmed || chatMutation.isPending) return

        const userMessage: ChatMessage = {
            role: "user",
            content: trimmed,
            timestamp: new Date().toISOString(),
        }

        // 낙관적 UI: 유저 메시지 즉시 표시
        setOptimisticMessages((prev) => [...prev, userMessage])
        setInput("")
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }

        try {
            const response = await chatMutation.mutateAsync({
                project_id: projectId,
                message: trimmed,
            })

            // 서버 응답 수신 → 어시스턴트 메시지 추가 (invalidateQueries가 서버 데이터를 가져올 때까지)
            setOptimisticMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: response.content,
                    timestamp: response.timestamp,
                    agent: response.agent,
                },
            ])
        } catch {
            // 에러 시 에러 메시지 표시
            setOptimisticMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
                    timestamp: new Date().toISOString(),
                },
            ])
        }
    }

    // 서버 데이터가 갱신되면 낙관적 메시지 제거
    useEffect(() => {
        if (history && history.length > 0 && optimisticMessages.length > 0) {
            setOptimisticMessages([])
        }
    }, [history, optimisticMessages.length])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleReset = async () => {
        setResetModalOpen(false)
        await resetMutation.mutateAsync(projectId)
        setOptimisticMessages([])
    }

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] border border-border rounded-lg bg-background">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">AI 어시스턴트</h3>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setResetModalOpen(true)}
                    disabled={messages.length === 0}
                    title="대화 리셋"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground text-sm">
                            <p className="mb-2">규제 샌드박스에 대해 질문해보세요.</p>
                            <p className="text-xs text-muted-foreground/70">
                                프로젝트 분석 결과, 제도/법령, 승인 사례에 대해 답변드립니다.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                            }`}
                        >
                            {msg.role === "assistant" ? (
                                <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:mt-2 prose-headings:mb-1">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {/* 로딩 인디케이터 */}
                {chatMutation.isPending && optimisticMessages.at(-1)?.role === "user" && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            답변 생성 중...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="border-t border-border px-4 py-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            adjustTextareaHeight()
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="질문을 입력하세요..."
                        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                        rows={1}
                        disabled={chatMutation.isPending}
                    />
                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleSend}
                        disabled={!input.trim() || chatMutation.isPending}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* 리셋 확인 모달 */}
            <ConfirmModal
                isOpen={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                onConfirm={handleReset}
                title="대화 리셋"
                description="대화를 리셋하면 이전 대화 내용을 복구할 수 없습니다."
                confirmLabel="리셋"
                cancelLabel="취소"
                confirmVariant="destructive"
            />
        </div>
    )
}
