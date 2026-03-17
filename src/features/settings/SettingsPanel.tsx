import { useRef, useState } from 'react';
import { AlertTriangle, Database, Download, FileText, FolderUp, HardDriveDownload, ShieldAlert, X } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';

interface FeedbackState {
  tone: 'success' | 'error';
  text: string;
}

interface Props {
  batteryCount: number;
  logCount: number;
  onClose: () => void;
  onImportDatabase: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onExportDatabase: () => Promise<void>;
  onExportText: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  onClearDatabase: () => Promise<{ ok: boolean; error?: string }>;
}

export default function SettingsPanel({
  batteryCount,
  logCount,
  onClose,
  onImportDatabase,
  onExportDatabase,
  onExportText,
  onExportPdf,
  onClearDatabase,
}: Readonly<Props>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setFeedback(null);

    try {
      await action();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'The settings action could not be completed.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setFeedback({
        tone: 'error',
        text: 'Choose a VoltTrack database backup before importing.',
      });
      return;
    }

    await runAction(async () => {
      const result = await onImportDatabase(selectedFile);
      if (!result.ok) {
        throw new Error(result.error ?? 'The database import failed.');
      }

      setFeedback({
        tone: 'success',
        text: `Imported ${selectedFile.name} and refreshed the tracker.`,
      });
      setSelectedFile(null);
      setClearConfirmationOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleClearDatabase = async () => {
    await runAction(async () => {
      const result = await onClearDatabase();
      if (!result.ok) {
        throw new Error(result.error ?? 'The database could not be cleared.');
      }

      setFeedback({
        tone: 'success',
        text: 'All batteries and log history were removed from the database.',
      });
      setClearConfirmationOpen(false);
    });
  };

  const handleExport = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    await runAction(async () => {
      await action();
      setFeedback({
        tone: 'success',
        text: successMessage,
      });
    });
  };

  return (
    <Dialog
      onClose={onClose}
      overlayClassName="items-start overflow-y-auto bg-black/70 md:p-8"
      contentClassName="relative w-full max-w-6xl animate-in fade-in zoom-in-95 overflow-hidden border border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-5 duration-200 sm:p-6 md:p-7"
      titleId="settings-dialog-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/8 bg-[#1c2128] p-2.5 text-gray-400 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-colors hover:bg-[#242a33] hover:text-gray-100"
        aria-label="Close settings dialog"
      >
        <X className="h-5 w-5" />
      </button>

      <h3 id="settings-dialog-title" className="sr-only">Data Controls</h3>

      {feedback && (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.tone === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <section className="rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_42px_rgba(4,10,20,0.36)]">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-[18px] bg-blue-500/10 p-3 text-blue-300 ring-1 ring-blue-400/10">
              <FolderUp className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-100">Import Database Backup</h4>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-400">
                Restore the app from a previously exported VoltTrack database file.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            aria-label="Choose backup file"
            accept=".db,.sqlite,.sqlite3,application/x-sqlite3"
            className="hidden"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />

          <div className="rounded-[20px] border border-white/5 bg-[#1b1f25] px-4 py-4 shadow-[inset_0_8px_24px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Selected Backup</p>
            <p className="mt-2.5 text-base font-medium text-gray-100">
              {selectedFile ? selectedFile.name : 'No backup file selected yet.'}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-gray-500">Use a previously exported `.db` file to replace the current local database.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full py-2.5"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Backup
            </Button>
            <Button
              type="button"
              className="flex w-full items-center justify-center gap-2 py-2.5"
              disabled={isBusy || !selectedFile}
              onClick={handleImport}
            >
              <HardDriveDownload className="h-4 w-4" />
              <span>Import DB</span>
            </Button>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_42px_rgba(4,10,20,0.36)]">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-[18px] bg-cyan-500/10 p-3 text-cyan-300 ring-1 ring-cyan-400/10">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-100">Export Data</h4>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-400">
                Save a restorable database backup or generate shareable text and PDF reports.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <Button
              type="button"
              className="flex w-full items-center justify-center gap-2 py-3"
              disabled={isBusy}
              onClick={() => handleExport(onExportDatabase, 'Database backup downloaded.')}
            >
              <Database className="h-4 w-4" />
              <span>Export DB Backup</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex w-full items-center justify-center gap-2 py-3"
              disabled={isBusy}
              onClick={() => handleExport(onExportText, 'Text report downloaded.')}
            >
              <FileText className="h-4 w-4" />
              <span>Export TXT Report</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex w-full items-center justify-center gap-2 py-3"
              disabled={isBusy}
              onClick={() => handleExport(onExportPdf, 'PDF report downloaded.')}
            >
              <FileText className="h-4 w-4" />
              <span>Export PDF Report</span>
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-red-500/16 bg-[linear-gradient(180deg,rgba(127,29,29,0.16),rgba(127,29,29,0.08))] xl:col-span-2">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center">
            <div>
              <div className="mb-4 flex items-start gap-4">
                <div className="rounded-[18px] bg-red-500/12 p-3 text-red-300 ring-1 ring-red-400/12">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-100">Clear Database</h4>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-300/80">
                    Remove every battery and log record from the local tracker. This cannot be undone without a backup.
                  </p>
                </div>
              </div>

              <div className="rounded-[20px] border border-red-400/8 bg-black/10 px-4 py-3.5 text-sm leading-6 text-red-100/80">
                Use this only when you want a completely clean slate. Export a database backup first if there is any chance you will need to restore the current records later.
              </div>
            </div>

            <div className="rounded-[22px] border border-white/6 bg-[#171b21]/85 p-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_rgba(4,10,20,0.36)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-300/75">Danger Zone</p>
              <p className="mt-2.5 text-sm leading-6 text-gray-400">
                This permanently deletes all batteries and activity history stored in the local database.
              </p>

              {!clearConfirmationOpen && (
                <Button
                  type="button"
                  variant="danger"
                  className="mt-4 flex w-full items-center justify-center gap-2 py-3"
                  disabled={isBusy}
                  onClick={() => setClearConfirmationOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Clear Database</span>
                </Button>
              )}

              {clearConfirmationOpen && (
                <div className="mt-4 rounded-[20px] border border-red-500/18 bg-red-500/6 p-4">
                  <p className="text-sm leading-6 text-red-100/90">
                    Confirm clearing the tracker database. Export a DB backup first if you may need to restore this data.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Button
                      type="button"
                      variant="danger"
                      className="flex w-full items-center justify-center gap-2"
                      disabled={isBusy}
                      onClick={handleClearDatabase}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Confirm Clear</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={isBusy}
                      onClick={() => setClearConfirmationOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
