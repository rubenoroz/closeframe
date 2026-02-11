import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
}

export function InputModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    placeholder = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
}: InputModalProps) {
    const [value, setValue] = useState("");

    // Reset value when modal opens
    useEffect(() => {
        if (isOpen) setValue("");
    }, [isOpen]);

    const handleConfirm = () => {
        if (value.trim()) {
            onConfirm(value);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleConfirm();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-neutral-900 dark:text-neutral-100">{title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="col-span-3 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
                        autoFocus
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700">
                        {cancelText}
                    </Button>
                    <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
