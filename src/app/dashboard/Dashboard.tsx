"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
// Add DashboardCharts next to test if it causes issues
import DashboardCharts from "@/components/DashboardCharts";

function DashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileId = searchParams.get('fileId');

    // Simple data for testing charts
    const testFiles = [
        { id: 1, name: "test1.json", category: "Data", storage_type: "json", record_count: 100 },
        { id: 2, name: "test2.json", category: "API", storage_type: "json", record_count: 50 }
    ];

    const handleAnalyzeJSON = (file: any) => {
        console.log("Analyzing file:", file);
    };

    useEffect(() => {
        // Simulate loading
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    }, []);

    if (loading) return <p className="text-gray-400 text-center mt-10">Loading dashboard data...</p>;
    if (error) return <p className="text-red-400 text-center mt-10">Error: {error}</p>;

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                <Button onClick={() => router.push('/json-editor')} className="bg-blue-600 hover:bg-blue-700">
                    Write JSON
                </Button>
            </div>
            <div className="text-white">
                <p>✅ useSearchParams working! File ID: {fileId || 'None'}</p>
            </div>

            {/* Test charts */}
            <DashboardCharts files={testFiles} onAnalyzeJSON={handleAnalyzeJSON} />
        </div>
    );
}

export default DashboardContent;
