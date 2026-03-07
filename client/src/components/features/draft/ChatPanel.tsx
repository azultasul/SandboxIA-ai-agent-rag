"use client"

import { Button } from "@/components/ui/button"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { useChatResetMutation } from "@/hooks/mutations/use-chat-mutation"
import { useChatHistoryQuery } from "@/hooks/queries/use-chat-query"
import { chatApi } from "@/lib/api/chat"
import type { ChatMessage } from "@/types/api/chat"
import { Loader2, RotateCcw, Send } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatPanelProps {
    projectId: string
}

export function ChatPanel({ projectId }: ChatPanelProps) {
    const [input, setInput] = useState("")
    const [resetModalOpen, setResetModalOpen] = useState(false)
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const serverLengthRef = useRef(0)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const { data: history } = useChatHistoryQuery(projectId)
    const resetMutation = useChatResetMutation()

    // 서버 히스토리가 갱신되면 로컬 메시지와 동기화
    // 로컬에서 추가한 메시지(서버 길이 이후)는 유지
    useEffect(() => {
        if (!history) return
        const localOnly = localMessages.slice(serverLengthRef.current)
        setLocalMessages([...history, ...localOnly])
        serverLengthRef.current = history.length
    }, [history]) // eslint-disable-line react-hooks/exhaustive-deps

    // 자동 스크롤 (채팅 컨테이너 내부만)
    const scrollToBottom = useCallback(() => {
        const container = scrollContainerRef.current
        if (container) {
            container.scrollTop = container.scrollHeight
        }
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [localMessages.length, scrollToBottom])

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
        if (!trimmed || isLoading) return

        const userMessage: ChatMessage = {
            role: "user",
            content: trimmed,
            timestamp: new Date().toISOString(),
        }

        // 유저 메시지 즉시 표시
        setLocalMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }

        try {
            const response = await chatApi.sendMessage({
                project_id: projectId,
                message: trimmed,
            })

            // 어시스턴트 응답 추가
            setLocalMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: response.content,
                    timestamp: response.timestamp,
                    agent: response.agent,
                },
            ])
            // 서버 길이 업데이트 (다음 히스토리 동기화 시 중복 방지)
            serverLengthRef.current += 2 // user + assistant
        } catch {
            setLocalMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
                    timestamp: new Date().toISOString(),
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleReset = async () => {
        setResetModalOpen(false)
        await resetMutation.mutateAsync(projectId)
        setLocalMessages([])
    }

    return (
        <div className="flex flex-col h-[calc(100vh-230px)] border border-border rounded-lg bg-background">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">AI 어시스턴트</h3>
                <button
                    type="button"
                    className="text-foreground hover:opacity-70 disabled:opacity-30"
                    onClick={() => setResetModalOpen(true)}
                    disabled={localMessages.length === 0}
                    title="대화 리셋"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* 메시지 영역 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {localMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground text-sm">
                            <p className="mb-2">규제 샌드박스에 대해 질문해보세요.</p>
                            <p className="text-xs text-muted-foreground/70">
                                프로젝트 분석 결과, 제도/법령, 승인 사례에 대해 답변드립니다.
                            </p>
                        </div>
                    </div>
                )}

                {localMessages.map((msg, idx) => (
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
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            답변 생성 중...
                        </div>
                    </div>
                )}

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
                        className="flex-1 resize-none rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 h-8 py-0 leading-8"
                        rows={1}
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
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
