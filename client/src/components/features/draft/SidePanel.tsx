"use client"

import { Button } from "@/components/ui/button"
import type { ApprovalCase, Regulation } from "@/types/api/eligibility"
import { BookOpen, MessageSquare, PanelLeft, PanelRight, Scale } from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"
import type { CaseData, ReferenceTab } from "./ReferencePanel"
import { ReferencePanel } from "./ReferencePanel"

const ChatPanel = dynamic(() => import("./ChatPanel").then((mod) => mod.ChatPanel), { ssr: false })

type PanelMode = "reference" | "chat" | "closed"

interface SidePanelProps {
    approvalCases?: ApprovalCase[]
    regulations?: Regulation[]
    cases?: CaseData[]
    track?: string
    projectId?: string
}

export function SidePanel({ approvalCases, regulations, cases, track, projectId }: SidePanelProps) {
    const showChat = !!projectId
    const [mode, setMode] = useState<PanelMode>("reference")
    const [prevMode, setPrevMode] = useState<Exclude<PanelMode, "closed">>("reference")
    const [refTab, setRefTab] = useState<ReferenceTab>("regulations")

    const handleSetMode = (next: PanelMode) => {
        if (next !== "closed") setPrevMode(next)
        setMode(next)
    }

    const handleOpen = () => handleSetMode(prevMode)

    return (
        <div className={mode !== "closed" ? "flex-1 min-w-0" : "shrink-0"}>
            <div className="sticky top-24">
                {mode !== "closed" && (
                    <div className="space-y-3 min-w-0">
                        <div className="flex items-center gap-2">
                            {/* 참고자료 / AI 채팅 선택 (draft 페이지만) */}
                            {showChat && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        className={`flex items-center justify-center rounded-md h-8 w-8 ${
                                            mode === "reference"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                        onClick={() => handleSetMode("reference")}
                                        title="참고자료"
                                    >
                                        <BookOpen className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex items-center justify-center rounded-md h-8 w-8 ${
                                            mode === "chat"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                        onClick={() => handleSetMode("chat")}
                                        title="AI 채팅"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* 법령·제도 / 승인사례 탭 (참고자료 모드일 때만) */}
                            {mode === "reference" && (
                                <>
                                    {showChat && <div className="border-l border-border h-6" />}
                                    <div className="flex rounded-md bg-gray-100 p-0.5 h-8">
                                        <button
                                            type="button"
                                            className={`flex items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
                                                refTab === "regulations"
                                                    ? "bg-white text-black shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            onClick={() => setRefTab("regulations")}
                                        >
                                            <Scale className="h-3.5 w-3.5" />
                                            법령·제도
                                        </button>
                                        <button
                                            type="button"
                                            className={`flex items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
                                                refTab === "cases"
                                                    ? "bg-white text-black shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            onClick={() => setRefTab("cases")}
                                        >
                                            <BookOpen className="h-3.5 w-3.5" />
                                            승인사례
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="flex-1" />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSetMode("closed")}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="패널 닫기"
                            >
                                <PanelRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {mode === "reference" && (
                            <ReferencePanel
                                approvalCases={approvalCases}
                                regulations={regulations}
                                cases={cases}
                                track={track}
                                activeTab={refTab}
                            />
                        )}
                        {showChat && (
                            <div className={mode === "chat" ? "" : "hidden"}>
                                <ChatPanel projectId={projectId} />
                            </div>
                        )}
                    </div>
                )}
                {mode === "closed" && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={handleOpen}
                        title="패널 열기"
                    >
                        <PanelLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
