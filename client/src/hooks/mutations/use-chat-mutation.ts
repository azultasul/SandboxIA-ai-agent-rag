/**
 * 채팅 관련 뮤테이션 훅
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { chatApi } from "@/lib/api/chat"
import { chatKeys } from "@/hooks/queries/use-chat-query"
import type { ChatRequest, ChatResponse } from "@/types/api/chat"

/**
 * 채팅 메시지 전송 뮤테이션
 */
export function useChatMutation() {
    const queryClient = useQueryClient()

    return useMutation<ChatResponse, Error, ChatRequest>({
        mutationFn: chatApi.sendMessage,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: chatKeys.history(variables.project_id) })
        },
    })
}

/**
 * 대화 내역 리셋 뮤테이션
 */
export function useChatResetMutation() {
    const queryClient = useQueryClient()

    return useMutation<{ success: boolean }, Error, string>({
        mutationFn: chatApi.resetHistory,
        onSuccess: (_data, projectId) => {
            queryClient.invalidateQueries({ queryKey: chatKeys.history(projectId) })
        },
    })
}
