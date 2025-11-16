"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function DashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Simple test to verify useSearchParams works
    const fileId = searchParams.get('fileId');

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                <Button onClick={() => router.push('/json-editor')} className="bg-blue-600 hover:bg-blue-700">
                    Write JSON
                </Button>
            </div>
            <div className="text-white">
                <p>Dashboard working! File ID from search params: {fileId || 'None'}</p>
            </div>
        </div>
    );
}

export default DashboardContent;
