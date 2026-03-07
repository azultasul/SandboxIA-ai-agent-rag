/**
 * 대화 내역 조회 훅
 */

import { useQuery } from "@tanstack/react-query"
import { chatApi } from "@/lib/api/chat"
import type { ChatMessage } from "@/types/api/chat"

export const chatKeys = {
    all: ["chat"] as const,
    history: (projectId: string) => ["chat", "history", projectId] as const,
}

export function useChatHistoryQuery(projectId: string | undefined) {
    return useQuery<ChatMessage[]>({
        queryKey: chatKeys.history(projectId ?? ""),
        queryFn: () => chatApi.getHistory(projectId!),
        enabled: !!projectId,
    })
}
