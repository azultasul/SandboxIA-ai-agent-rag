"use client"

import { Badge } from "@/components/ui/badge"
import { formatDateIso } from "@/lib/utils/date"
import type { ApprovalCase, Regulation } from "@/types/api/eligibility"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface CaseData {
    id: string | number
    title: string
    company: string
    approvedDate?: string
    track: string
    summary: string
    relevance?: number
    link?: string
}

export type ReferenceTab = "regulations" | "cases"

interface ReferenceItemData {
    title: string
    subtitle?: string
    badge?: string
    date?: string
    summary: string
    sourceUrl?: string | null
    linkLabel?: string
}

interface ReferenceItemProps {
    data: ReferenceItemData
    index: number
    idPrefix?: string
    markdown?: boolean
}

function ReferenceItem({ data, index, idPrefix = "ref", markdown = true }: ReferenceItemProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const handleToggle = () => setIsExpanded(!isExpanded)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleToggle()
        }
    }

    const contentId = `${idPrefix}-content-${index}`

    return (
        <div className="border border-border rounded-lg">
            <button
                type="button"
                className="w-full p-3 gap-2 text-left hover:bg-muted/50 transition-colors"
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                aria-expanded={isExpanded}
                aria-controls={contentId}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {(data.badge || data.date) && (
                            <div className="flex items-center gap-2 mb-1">
                                {data.badge && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {data.badge}
                                    </Badge>
                                )}
                                {data.date && <span className="text-xs text-muted-foreground">{formatDateIso(data.date)}</span>}
                            </div>
                        )}
                        <h4 className="font-medium text-sm">{data.title}</h4>
                        {data.subtitle && <p className="text-xs text-muted-foreground">{data.subtitle}</p>}
                    </div>
                    <div className="flex items-center">
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {isExpanded && (
                    <div id={contentId} className="mt-3 ">
                        <div className="pt-3 border-t border-border">
                            {markdown ? (
                                <div className="text-sm text-muted-foreground prose prose-sm prose-neutral max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:text-foreground prose-headings:text-sm prose-headings:mt-2 prose-headings:mb-1 prose-a:text-primary">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.summary.replace(/\[[^\]]*\]\s*/, "")}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground whitespace-pre-line">
                                    {data.summary.replace(/\[[^\]]*\]\s*/, "")}
                                </div>
                            )}
                            {data.sourceUrl && (
                                <a
                                    href={data.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 text-xs text-primary hover:text-primary/50 inline-flex items-center gap-1"
                                >
                                    {data.linkLabel ?? "상세보기"} <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </button>
        </div>
    )
}

interface ReferencePanelProps {
    approvalCases?: ApprovalCase[]
    regulations?: Regulation[]
    cases?: CaseData[]
    track?: string
    activeTab: ReferenceTab
}

export function ReferencePanel({ approvalCases, regulations, cases, track, activeTab }: ReferencePanelProps) {
    const convertedCases: ApprovalCase[] | undefined = cases?.map((c) => ({
        track: c.track,
        date: c.approvedDate || "",
        similarity: c.relevance,
        title: c.title,
        company: c.company,
        summary: c.summary,
        source_url: c.link || null,
    }))

    const displayCases = approvalCases ?? convertedCases ?? []
    const regs = regulations ?? []

    return (
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-3">
            {activeTab === "regulations" && (
                <>
                    {regs.length > 0 ? (
                        regs.map((reg, index) => (
                            <ReferenceItem
                                key={`${reg.title}-${index}`}
                                data={{
                                    title: reg.title,
                                    summary: reg.summary,
                                    sourceUrl: reg.source_url,
                                    linkLabel: "원문보기",
                                }}
                                index={index}
                                idPrefix="reg"
                                markdown={reg.markdown}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">참고할 관련 법령이 없습니다.</div>
                    )}
                </>
            )}

            {activeTab === "cases" && (
                <>
                    {displayCases.length > 0 ? (
                        displayCases.map((caseData, index) => (
                            <ReferenceItem
                                key={`${caseData.title}-${caseData.company}`}
                                data={{
                                    title: caseData.title,
                                    subtitle: caseData.company,
                                    badge: caseData.track,
                                    date: caseData.date,
                                    summary: caseData.summary,
                                    sourceUrl: caseData.source_url,
                                }}
                                index={index}
                                idPrefix="case"
                            />
                        ))
                    ) : track === "quick_check" ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            신속확인은 트랙 판단을 위한 절차로,
                            <br />
                            참고할 유사 승인사례가 없습니다.
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">참고할 유사 승인사례가 없습니다.</div>
                    )}
                </>
            )}
        </div>
    )
}
