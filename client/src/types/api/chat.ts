export interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
    agent?: string
}

export interface ChatRequest {
    project_id: string
    message: string
}

export interface ChatResponse {
    role: "assistant"
    content: string
    agent: string
    timestamp: string
}
