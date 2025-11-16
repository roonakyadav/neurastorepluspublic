"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "react-i18next";
import { animatePageContainer, animateButtons } from "@/utils/animations";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { addToast } = useToast();
    const { t, i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);
    const [settings, setSettings] = useState({
        notifications: true,
        autoAnalysis: true,
        defaultView: 'grid',
        language: 'en',
    });

    useEffect(() => {
        setMounted(true);
        // Load settings from localStorage or API
        const savedSettings = localStorage.getItem('neurastore-settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
        // Load language from localStorage
        const savedLanguage = localStorage.getItem('neurastore-language') || 'en';
        i18n.changeLanguage(savedLanguage);
        setSettings(prev => ({ ...prev, language: savedLanguage }));

        // Animate elements
        animatePageContainer('div.space-y-6');
        animateButtons('button');
    }, [i18n]);

    const updateSetting = (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('neurastore-settings', JSON.stringify(newSettings));
    };

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language);
        updateSetting('language', language);
        localStorage.setItem('neurastore-language', language);
        addToast('info', 'Language Updated', `Language changed to ${language === 'en' ? 'English' : language === 'es' ? 'Español' : language === 'hi' ? 'हिंदी' : 'Français'}.`);
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Customize your NeuraStore+ experience
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize how NeuraStore+ looks and feels
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Theme</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred color scheme
                                </p>
                            </div>
                            <Select value={theme} onValueChange={setTheme}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Default View</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose how files are displayed by default
                                </p>
                            </div>
                            <Select
                                value={settings.defaultView}
                                onValueChange={(value) => updateSetting('defaultView', value)}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grid">Grid</SelectItem>
                                    <SelectItem value="list">List</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Behavior</CardTitle>
                        <CardDescription>
                            Configure how NeuraStore+ behaves
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto Analysis</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically analyze files after upload
                                </p>
                            </div>
                            <Switch
                                checked={settings.autoAnalysis}
                                onCheckedChange={(checked) => updateSetting('autoAnalysis', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive notifications for file analysis completion
                                </p>
                            </div>
                            <Switch
                                checked={settings.notifications}
                                onCheckedChange={(checked) => updateSetting('notifications', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Language & Region</CardTitle>
                        <CardDescription>
                            Set your language and regional preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Language</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred language
                                </p>
                            </div>
                            <Select
                                value={settings.language}
                                onValueChange={changeLanguage}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="fr">Français</SelectItem>
                                    <SelectItem value="de">Deutsch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Management</CardTitle>
                        <CardDescription>
                            Manage your data and privacy settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Export Data</Label>
                                <p className="text-sm text-muted-foreground">
                                    Download all your data in JSON format
                                </p>
                            </div>
                            <Button variant="outline">Export</Button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Clear History</Label>
                                <p className="text-sm text-muted-foreground">
                                    Delete all uploaded files and metadata
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                disabled={clearingHistory}
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete all files and history? This action cannot be undone.')) {
                                        setClearingHistory(true);
                                        try {
                                            // Get all files metadata first
                                            const { data: files, error: fetchError } = await supabase
                                                .from('files_metadata')
                                                .select('id, public_url, folder_path, name');

                                            if (fetchError) {
                                                throw new Error(`Failed to fetch files: ${fetchError.message}`);
                                            }

                                            if (files && files.length > 0) {
                                                // Delete files from storage
                                                const storagePaths: string[] = [];
                                                for (const file of files) {
                                                    try {
                                                        // Parse path from public_url
                                                        // URL format: https://[project].supabase.co/storage/v1/object/public/media/[path]
                                                        const urlParts = file.public_url.split('/storage/v1/object/public/media/');
                                                        if (urlParts.length >= 2) {
                                                            const storagePath = urlParts[1];
                                                            storagePaths.push(storagePath);
                                                        }
                                                    } catch (parseError) {
                                                        console.error('Error parsing URL for file:', file.name, parseError);
                                                    }
                                                }

                                                // Delete files from storage in batches
                                                if (storagePaths.length > 0) {
                                                    const batchSize = 10;
                                                    for (let i = 0; i < storagePaths.length; i += batchSize) {
                                                        const batch = storagePaths.slice(i, i + batchSize);
                                                        const { error: storageError } = await supabase.storage
                                                            .from('media')
                                                            .remove(batch);

                                                        if (storageError) {
                                                            console.error('Error deleting storage files:', storageError);
                                                            // Continue with metadata deletion even if storage deletion fails
                                                        }
                                                    }
                                                }

                                                // Delete all related data from database
                                                // Delete from json_schemas first (due to foreign key constraint)
                                                const { error: schemaError } = await supabase
                                                    .from('json_schemas')
                                                    .delete()
                                                    .gte('created_at', '2000-01-01T00:00:00Z'); // Match all records created after year 2000

                                                if (schemaError) {
                                                    console.error('Error deleting schemas:', schemaError);
                                                }

                                                // Delete all metadata
                                                const { error: metadataError } = await supabase
                                                    .from('files_metadata')
                                                    .delete()
                                                    .gte('uploaded_at', '2000-01-01T00:00:00Z'); // Match all records uploaded after year 2000

                                                if (metadataError) {
                                                    throw new Error(`Failed to delete metadata: ${metadataError.message}`);
                                                }
                                            }

                                            // Set a flag to notify other components that history was cleared
                                            localStorage.setItem('neurastore-history-cleared', Date.now().toString());

                                            addToast('success', 'History Cleared', `Successfully deleted ${files?.length || 0} files and all associated data.`);
                                        } catch (error) {
                                            console.error('Error clearing history:', error);
                                            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                                            addToast('error', 'Clear History Failed', `An error occurred while clearing history: ${errorMessage}`);
                                        } finally {
                                            setClearingHistory(false);
                                        }
                                    }
                                }}
                            >
                                {clearingHistory ? 'Clearing History...' : 'Clear History'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
