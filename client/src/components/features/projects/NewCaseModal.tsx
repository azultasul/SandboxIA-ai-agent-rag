"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { useCreateProjectMutation } from "@/hooks/mutations/use-create-project-mutation"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { FlaskConical } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function NewCaseModal() {
    const router = useRouter()
    const { isNewCaseModalOpen, closeNewCaseModal } = useUIStore()
    const { user } = useAuthStore()
    const [formData, setFormData] = useState({
        companyName: "",
        serviceName: "",
        description: "",
    })

    const isTestUser = user?.email === process.env.NEXT_PUBLIC_TEST_USER_EMAIL

    const { mutate: createProject, isPending } = useCreateProjectMutation({
        onSuccess: (data) => {
            closeNewCaseModal()
            setFormData({ companyName: "", serviceName: "", description: "" })
            router.push(`/projects/${data.id}/service`)
        },
        onError: (error) => {
            alert(`프로젝트 생성 실패: ${error.message}`)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // user_id는 API에서 인증된 세션으로부터 자동으로 설정됨
        createProject({
            company_name: formData.companyName,
            service_name: formData.serviceName || undefined,
            service_description: formData.description || undefined,
        })
    }

    if (isTestUser) {
        return (
            <Modal open={isNewCaseModalOpen} onOpenChange={(open: boolean) => !open && closeNewCaseModal()}>
                <ModalContent className="sm:max-w-[400px]">
                    <ModalHeader>
                        <div className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5 text-muted-foreground" />
                            <ModalTitle>테스트 계정 안내</ModalTitle>
                        </div>
                        <ModalDescription className="mt-4">
                            테스트 계정으로는 새로운 프로젝트를 추가할 수 없습니다. <br />샘플 프로젝트를 참고해주세요.
                        </ModalDescription>
                    </ModalHeader>
                    <ModalFooter>
                        <Button onClick={closeNewCaseModal}>확인</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        )
    }

    return (
        <Modal open={isNewCaseModalOpen} onOpenChange={(open: boolean) => !open && closeNewCaseModal()}>
            <ModalContent className="sm:max-w-[500px]">
                <ModalHeader>
                    <ModalTitle>새 프로젝트 생성</ModalTitle>
                    <ModalDescription>새로운 샌드박스 신청 프로젝트를 생성합니다. 기본 정보를 입력해주세요.</ModalDescription>
                </ModalHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="companyName" className="text-sm font-medium">
                            기업명
                        </label>
                        <Input
                            id="companyName"
                            placeholder="기업명을 입력하세요"
                            value={formData.companyName}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    companyName: e.target.value,
                                })
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="serviceName" className="text-sm font-medium">
                            서비스명
                        </label>
                        <Input
                            id="serviceName"
                            placeholder="서비스명을 입력하세요"
                            value={formData.serviceName}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    serviceName: e.target.value,
                                })
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                            설명
                        </label>
                        <Textarea
                            id="description"
                            placeholder="서비스에 대한 간단한 설명을 입력하세요"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    description: e.target.value,
                                })
                            }
                            rows={4}
                        />
                    </div>
                    <ModalFooter>
                        <Button type="button" variant="outline" onClick={closeNewCaseModal} disabled={isPending}>
                            취소
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "생성 중..." : "생성하기"}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    )
}
