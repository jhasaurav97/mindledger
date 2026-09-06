import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  entryTitle?: string;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  entryTitle,
  isDeleting = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      id="delete-confirm-modal"
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
      title={title || 'Delete Reflection'}
      description="This action cannot be undone."
      footer={
        <>
          <Button
            id="cancel-delete-btn"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>

          <Button
            id="confirm-delete-btn"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
            leftIcon={!isDeleting ? <Trash2 className="w-3.5 h-3.5" /> : undefined}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          {entryTitle ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100 break-words">"{entryTitle}"</span>
          ) : (
            'this reflection'
          )}
          ? All chat messages, generated insights, and metadata associated with this entry will be removed from your secure Firestore database.
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div
            id="delete-modal-error-banner"
            className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Delete failed: </span>
              {errorMessage}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
