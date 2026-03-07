/**
 * Chat API Client
 *
 * Supervisor Agent 기반 AI 상담 챗봇 API 호출 함수
 */

import { getAuthToken } from "@/lib/supabase/client"
import type { ChatMessage, ChatRequest, ChatResponse } from "@/types/api/chat"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

export const chatApi = {
    sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
        const token = await getAuthToken()

        const response = await fetch(`${API_BASE}/api/v1/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
            throw new Error(errorData.detail || `Request failed: ${response.status}`)
        }

        return response.json()
    },

    getHistory: async (projectId: string): Promise<ChatMessage[]> => {
        const token = await getAuthToken()

        const response = await fetch(`${API_BASE}/api/v1/chat/${projectId}/history`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
            throw new Error(errorData.detail || `Request failed: ${response.status}`)
        }

        return response.json()
    },

    resetHistory: async (projectId: string): Promise<{ success: boolean }> => {
        const token = await getAuthToken()

        const response = await fetch(`${API_BASE}/api/v1/chat/${projectId}/history`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }))
            throw new Error(errorData.detail || `Request failed: ${response.status}`)
        }

        return response.json()
    },
}
