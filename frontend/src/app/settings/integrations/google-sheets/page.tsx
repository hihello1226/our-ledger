'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  externalSourcesAPI,
  householdAPI,
  accountsAPI,
  ExternalDataSource,
  Account,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Member = {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
};

export default function GoogleSheetsSettingsPage() {
  const [sources, setSources] = useState<ExternalDataSource[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<ExternalDataSource | null>(null);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [formSheetId, setFormSheetId] = useState('');
  const [formSheetName, setFormSheetName] = useState('Sheet1');
  const [formAccountId, setFormAccountId] = useState('');
  const [formSyncDirection, setFormSyncDirection] = useState('import');
  const [formColumnMapping, setFormColumnMapping] = useState({
    date: 0,
    amount: 1,
    type: 2,
    category: 3,
    memo: 4,
  });
  const [formPayerMemberId, setFormPayerMemberId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sourcesData, membersData, accountsData] = await Promise.all([
          externalSourcesAPI.list(),
          householdAPI.getMembers(),
          accountsAPI.list(),
        ]);
        setSources(sourcesData);
        setMembers(membersData);
        setAccounts(accountsData);

        const currentMember = membersData.find(m => m.user_id === user?.id);
        if (currentMember) {
          setFormPayerMemberId(currentMember.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const extractSheetId = (input: string): string => {
    // Handle full URL or just the ID
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  const openModal = (source?: ExternalDataSource) => {
    if (source) {
      setEditingSource(source);
      setFormSheetId(source.sheet_id);
      setFormSheetName(source.sheet_name);
      setFormAccountId(source.account_id || '');
      setFormSyncDirection(source.sync_direction);
      setFormColumnMapping(source.column_mapping as typeof formColumnMapping);
    } else {
      setEditingSource(null);
      setFormSheetId('');
      setFormSheetName('Sheet1');
      setFormAccountId('');
      setFormSyncDirection('import');
      setFormColumnMapping({
        date: 0,
        amount: 1,
        type: 2,
        category: 3,
        memo: 4,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSource(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sheetId = extractSheetId(formSheetId);
    if (!sheetId) {
      alert('유효한 Google Sheets URL 또는 ID를 입력해주세요.');
      return;
    }

    try {
      if (editingSource) {
        const updated = await externalSourcesAPI.update(editingSource.id, {
          sheet_name: formSheetName,
          account_id: formAccountId || undefined,
          sync_direction: formSyncDirection,
          column_mapping: formColumnMapping,
        });
        setSources(sources.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await externalSourcesAPI.createGoogleSheet({
          type: 'google_sheet',
          sheet_id: sheetId,
          sheet_name: formSheetName,
          account_id: formAccountId || undefined,
          sync_direction: formSyncDirection,
          column_mapping: formColumnMapping,
        });
        setSources([created, ...sources]);
      }
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await externalSourcesAPI.delete(id);
      setSources(sources.filter(s => s.id !== id));
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSyncImport = async (source: ExternalDataSource) => {
    if (!formPayerMemberId) {
      alert('결제자를 선택해주세요.');
      return;
    }

    setSyncLoading(source.id);
    try {
      const result = await externalSourcesAPI.syncImport(source.id, formPayerMemberId);
      alert(`Import 완료: ${result.imported_count}건 가져옴, ${result.skipped_count}건 건너뜀`);
      // Refresh sources to get updated last_synced_at
      const updatedSources = await externalSourcesAPI.list();
      setSources(updatedSources);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync에 실패했습니다.');
    } finally {
      setSyncLoading(null);
    }
  };

  const handleSyncExport = async (source: ExternalDataSource) => {
    setSyncLoading(source.id);
    try {
      const result = await externalSourcesAPI.syncExport(source.id);
      alert(`Export 완료: ${result.exported_count}건 내보냄`);
      const updatedSources = await externalSourcesAPI.list();
      setSources(updatedSources);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync에 실패했습니다.');
    } finally {
      setSyncLoading(null);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &lt; 대시보드
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Google Sheets 연동</h1>
          <button
            onClick={() => openModal()}
            className="btn-primary"
          >
            + 시트 등록
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Google Sheets 연동 안내</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>- Google Sheets URL 또는 시트 ID를 등록하세요</li>
            <li>- 시트는 서비스 계정과 공유되어야 합니다</li>
            <li>- 첫 번째 행은 헤더로 간주됩니다</li>
            <li>- Import: 시트에서 거래 내역을 가져옵니다</li>
            <li>- Export: 거래 내역을 시트로 내보냅니다</li>
          </ul>
        </div>

        {/* Payer Selection for Import */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Import 시 기본 결제자
          </label>
          <select
            value={formPayerMemberId}
            onChange={(e) => setFormPayerMemberId(e.target.value)}
            className="input max-w-xs"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.user_name}
              </option>
            ))}
          </select>
        </div>

        {/* Sources List */}
        {sources.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">
            등록된 Google Sheets가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <div key={source.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{source.sheet_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        source.sync_direction === 'import' ? 'bg-green-100 text-green-700' :
                        source.sync_direction === 'export' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {source.sync_direction === 'import' ? 'Import' :
                         source.sync_direction === 'export' ? 'Export' : '양방향'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      ID: {source.sheet_id.substring(0, 20)}...
                    </p>
                    <p className="text-sm text-gray-500">
                      마지막 동기화: {formatDateTime(source.last_synced_at)}
                      {source.last_synced_row && ` (${source.last_synced_row}행까지)`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(source)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* Sync Buttons */}
                <div className="flex gap-3 pt-3 border-t">
                  {(source.sync_direction === 'import' || source.sync_direction === 'both') && (
                    <button
                      onClick={() => handleSyncImport(source)}
                      disabled={syncLoading === source.id}
                      className="btn-secondary text-sm"
                    >
                      {syncLoading === source.id ? 'Syncing...' : 'Import 실행'}
                    </button>
                  )}
                  {(source.sync_direction === 'export' || source.sync_direction === 'both') && (
                    <button
                      onClick={() => handleSyncExport(source)}
                      disabled={syncLoading === source.id}
                      className="btn-secondary text-sm"
                    >
                      {syncLoading === source.id ? 'Syncing...' : 'Export 실행'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSource ? 'Google Sheet 수정' : 'Google Sheet 등록'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingSource && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Sheets URL 또는 ID
                  </label>
                  <input
                    type="text"
                    value={formSheetId}
                    onChange={(e) => setFormSheetId(e.target.value)}
                    className="input"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    전체 URL 또는 시트 ID를 입력하세요
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시트 이름
                </label>
                <input
                  type="text"
                  value={formSheetName}
                  onChange={(e) => setFormSheetName(e.target.value)}
                  className="input"
                  placeholder="Sheet1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연결 계좌 (선택)
                </label>
                <select
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  className="input"
                >
                  <option value="">선택 안함</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.bank_name ? `(${account.bank_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  동기화 방향
                </label>
                <select
                  value={formSyncDirection}
                  onChange={(e) => setFormSyncDirection(e.target.value)}
                  className="input"
                >
                  <option value="import">Import (시트 → 앱)</option>
                  <option value="export">Export (앱 → 시트)</option>
                  <option value="both">양방향</option>
                </select>
              </div>

              {/* Column Mapping */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  컬럼 매핑 (0부터 시작하는 열 번호)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">날짜</label>
                    <input
                      type="number"
                      value={formColumnMapping.date}
                      onChange={(e) => setFormColumnMapping({
                        ...formColumnMapping,
                        date: parseInt(e.target.value) || 0,
                      })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">금액</label>
                    <input
                      type="number"
                      value={formColumnMapping.amount}
                      onChange={(e) => setFormColumnMapping({
                        ...formColumnMapping,
                        amount: parseInt(e.target.value) || 0,
                      })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">유형</label>
                    <input
                      type="number"
                      value={formColumnMapping.type}
                      onChange={(e) => setFormColumnMapping({
                        ...formColumnMapping,
                        type: parseInt(e.target.value) || 0,
                      })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">카테고리</label>
                    <input
                      type="number"
                      value={formColumnMapping.category}
                      onChange={(e) => setFormColumnMapping({
                        ...formColumnMapping,
                        category: parseInt(e.target.value) || 0,
                      })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">메모</label>
                    <input
                      type="number"
                      value={formColumnMapping.memo}
                      onChange={(e) => setFormColumnMapping({
                        ...formColumnMapping,
                        memo: parseInt(e.target.value) || 0,
                      })}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingSource ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
