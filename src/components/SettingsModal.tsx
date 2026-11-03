import React, { useState } from 'react';
import { TVSettings } from '../types';
import {
  Settings,
  Cpu,
  Layers,
  Volume2,
  Subtitles,
  Globe,
  Gauge,
  Check,
  X,
  Sparkles,
  Moon,
  Tv,
  Download,
  Upload,
  ShieldCheck,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TVSettings;
  onUpdateSettings: (newSettings: Partial<TVSettings>) => void;
  onExportBackup?: () => void;
  diagnosticsEnabled: boolean;
  diagnosticEventCount: number;
  onDiagnosticsToggle: (enabled: boolean) => void;
  onExportDiagnostics: () => void;
  diagnosticsExportStatus: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportBackup,
  diagnosticsEnabled,
  diagnosticEventCount,
  onDiagnosticsToggle,
  onExportDiagnostics,
  diagnosticsExportStatus,
}) => {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBackup = () => {
    try {
      const backupData = {
        version: '2.4.0',
        exportedAt: new Date().toISOString(),
        settings,
      };
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'lenna_tv_settings_backup.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupStatus('สำรองข้อมูลการตั้งค่าสำเร็จ');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch {
      setBackupStatus('ไม่สามารถสำรองข้อมูลได้');
    }
  };

  return (
    <div data-tv-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl bg-[#090b10] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                ตั้งค่าระบบและการทำงานของ Android TV
              </h2>
              <p className="text-xs text-slate-400">
                ปรับแต่งฮาร์ดแวร์ บัฟเฟอร์แคช เสียง คำบรรยาย และการแสดงผลให้ลื่นไหล
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Performance & Video Decoding (Anti-Stutter) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>ประสิทธิภาพการประมวลผล (Performance & Anti-Stutter)</span>
          </div>

          {/* Hardware Decoder */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2.5">
            <div>
              <span className="text-sm font-medium text-white block">
                ตัวถอดรหัสวิดีโอ (Video Decoder Engine)
              </span>
              <span className="text-xs text-slate-400">
                ใช้ฮาร์ดแวร์ชิปเซ็ตของทีวีถอดรหัส ช่วยให้ซีพียูไม่โหลดหนักและเครื่องไม่ร้อน
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'exoplayer', name: 'ExoPlayer HW (แนะนำ)' },
                { id: 'hardware', name: 'MediaCodec Native' },
                { id: 'software', name: 'Software (CPU)' },
              ].map((dec) => (
                <button
                  key={dec.id}
                  onClick={() => onUpdateSettings({ decoder: dec.id as any })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    settings.decoder === dec.id
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {dec.name}
                </button>
              ))}
            </div>
          </div>

          {/* Buffer Cache */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white block">
                  ขนาดบัฟเฟอร์แคชล่วงหน้า (Buffer Preload Cache)
                </span>
                <span className="text-xs text-slate-400">
                  แก้ปัญหาสตรีมสด m3u8 หรือไฟล์ขนาดใหญ่สะดุดเมื่ออินเทอร์เน็ตแกว่ง
                </span>
              </div>
              <span className="text-xs font-mono text-white px-2 py-0.5 rounded bg-white/10">
                {settings.bufferSizeMB} MB
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[32, 64, 128, 256].map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ bufferSizeMB: size })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    settings.bufferSizeMB === size
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {size} MB
                </button>
              ))}
            </div>
          </div>

          {/* Low-End TV Mode / Ambient Backdrop */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                แอมเบียนต์แสงพื้นหลังตามโปสเตอร์ (Ambient Glow)
              </span>
              <span className="text-xs text-slate-400">
                ปิดการทำงานนี้ได้หากใช้กล่องแอนดรอยด์ทีวีรุ่นสเปกต่ำเพื่อประหยัด GPU
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ ambientBackdrop: !settings.ambientBackdrop })}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.ambientBackdrop ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  settings.ambientBackdrop ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 2: Audio, Sleep Timer & Subtitles */}
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>ระบบเสียง การตั้งเวลา และคำบรรยาย (Audio & Features)</span>
          </div>

          {/* Sound Profile */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2.5">
            <div>
              <span className="text-sm font-medium text-white block">
                โหมดโปรไฟล์เสียง (Sound Audio Mode)
              </span>
              <span className="text-xs text-slate-400">
                ปรับการประมวลผลเสียงให้เหมาะกับสภาพแวดล้อมการรับชม
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { id: 'cinema', label: 'Cinema (โรงหนัง)' },
                { id: 'voice_boost', label: 'เน้นเสียงพูด' },
                { id: 'night', label: 'โหมดกลางคืน' },
                { id: 'standard', label: 'มาตรฐาน' },
              ].map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => onUpdateSettings({ soundProfile: prof.id as any })}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                    settings.soundProfile === prof.id
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {prof.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Timer */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white flex items-center gap-2">
                <Moon className="w-4 h-4 text-amber-400" />
                ตั้งเวลาปิดอัตโนมัติ (Sleep Timer)
              </span>
              <span className="text-xs text-slate-400">
                หยุดเล่นและออกจากแอพเมื่อหมดเวลาเพื่อประหยัดไฟ
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {[
                { val: null, label: 'ปิด' },
                { val: 15, label: '15น.' },
                { val: 30, label: '30น.' },
                { val: 60, label: '60น.' },
                { val: 90, label: '90น.' },
              ].map((timer) => (
                <button
                  key={String(timer.val)}
                  onClick={() => onUpdateSettings({ sleepTimerMinutes: timer.val })}
                  className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                    settings.sleepTimerMinutes === timer.val
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {timer.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Passthrough */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                ส่งตรงสัญญาณเสียงดิจิทัล (Audio Passthrough HDMI ARC)
              </span>
              <span className="text-xs text-slate-400">
                ส่งสัญญาณเสียง Dolby Atmos, DTS-HD โดยตรงไปยัง Soundbar หรือ AVR
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ audioPassthrough: !settings.audioPassthrough })}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.audioPassthrough ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  settings.audioPassthrough ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Subtitle Size & Color */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                ขนาดและสีคำบรรยาย (Subtitles for 10-ft TV)
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: 'white', label: 'สีขาว' },
                  { id: 'yellow', label: 'สีเหลือง TV' },
                  { id: 'cyan', label: 'สีฟ้า' },
                ].map((col) => (
                  <button
                    key={col.id}
                    onClick={() => onUpdateSettings({ subtitleColor: col.id as any })}
                    className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                      settings.subtitleColor === col.id
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-slate-400">ขนาดตัวอักษร</span>
              <div className="flex gap-2">
                {[
                  { id: 'small', label: 'เล็ก' },
                  { id: 'medium', label: 'ปกติ' },
                  { id: 'large', label: 'ใหญ่' },
                ].map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => onUpdateSettings({ subtitleSize: sz.id as any })}
                    className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                      settings.subtitleSize === sz.id
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Language & Backup */}
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Globe className="w-4 h-4 text-purple-400" />
            <span>ภาษาและการสำรองข้อมูล (Language & Backup)</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-white">ภาษาของแอป (App Language)</span>
            <div className="flex gap-2">
              {[
                { id: 'th', label: 'ภาษาไทย' },
                { id: 'en', label: 'English' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => onUpdateSettings({ language: lang.id as any })}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    settings.language === lang.id
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Backup Button */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                สำรองข้อมูลการตั้งค่า (Export Backup JSON)
              </span>
              <span className="text-xs text-slate-400">
                บันทึกการปรับแต่งทั้งหมดเป็นไฟล์เพื่อนำไปใช้กับกล่องทีวีเครื่องอื่น
              </span>
            </div>
            <button
              onClick={handleBackup}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด</span>
            </button>
          </div>

          {backupStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center">
              {backupStatus}
            </div>
          )}
        </div>

        {/* Opt-in diagnostics for real Android TV testing */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>รายงานการทดสอบ (Diagnostics)</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-white">อนุญาตเก็บข้อมูลการใช้งานเพื่อวิเคราะห์ปัญหา</span>
                <span className="text-xs text-slate-400">เก็บเฉพาะปุ่มรีโมท การเปลี่ยนโฟกัส การเลื่อน และชนิดข้อผิดพลาด บันทึกไว้ในหน่วยความจำระหว่างเปิดแอป</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={diagnosticsEnabled}
                onClick={() => onDiagnosticsToggle(!diagnosticsEnabled)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold ${diagnosticsEnabled ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}
              >
                {diagnosticsEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <span className="text-xs text-slate-400">เหตุการณ์ที่บันทึก: {diagnosticEventCount}</span>
              <button
                type="button"
                onClick={() => onExportDiagnostics()}
                disabled={diagnosticEventCount === 0}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ดาวน์โหลดรายงาน JSON
              </button>
            </div>
            {diagnosticsExportStatus && (
              <p role="status" className="text-xs text-emerald-300">{diagnosticsExportStatus}</p>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed">ไม่เก็บรหัสผ่าน โทเคน ข้อความที่กรอก ชื่อสื่อ URL หรือข้อมูลเซิร์ฟเวอร์ รายงานจะถูกสร้างเมื่อคุณกดดาวน์โหลดเท่านั้น</p>
          </div>
        </section>

        {/* App specs footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-500">
          <span>Metur TV for Android TV v2.4.0</span>
          <span>GPU Acceleration: Active (60 FPS)</span>
        </div>
      </div>
    </div>
  );
};
