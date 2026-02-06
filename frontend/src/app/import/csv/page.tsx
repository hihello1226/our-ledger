'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  importAPI,
  householdAPI,
  accountsAPI,
  CSVUploadResponse,
  CSVColumnMapping,
  Account,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Member = {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
};

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export default function CSVImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState('utf-8');
  const [uploadError, setUploadError] = useState('');

  // Upload response
  const [uploadResponse, setUploadResponse] = useState<CSVUploadResponse | null>(null);

  // Mapping state
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({
    date: '',
    amount: '',
    type: '',
    category: '',
    subcategory: '',
    memo: '',
    account: '',
  });

  // Import options
  const [defaultPayerMemberId, setDefaultPayerMemberId] = useState('');
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Result state
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    skipped_count: number;
    error_count: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersData, accountsData] = await Promise.all([
          householdAPI.getMembers(),
          accountsAPI.list(),
        ]);
        setMembers(membersData);
        setAccounts(accountsData);

        const currentMember = membersData.find(m => m.user_id === user?.id);
        if (currentMember) {
          setDefaultPayerMemberId(currentMember.id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setUploadError('');

    try {
      const response = await importAPI.uploadCSV(file, encoding);
      setUploadResponse(response);
      setColumnMapping(response.suggested_mapping);
      setStep('mapping');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMapping = () => {
    if (!columnMapping.date || !columnMapping.amount) {
      alert('날짜와 금액 컬럼은 필수입니다.');
      return;
    }
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    if (!uploadResponse) return;
    if (!defaultPayerMemberId) {
      alert('기본 결제자를 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      const result = await importAPI.confirmCSV({
        file_id: uploadResponse.file_id,
        column_mapping: columnMapping,
        default_account_id: defaultAccountId || undefined,
        default_payer_member_id: defaultPayerMemberId,
        skip_duplicates: skipDuplicates,
      });
      setImportResult(result);
      setStep('result');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setUploadResponse(null);
    setImportResult(null);
    setUploadError('');
  };

  if (authLoading) {
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
          <h1 className="text-xl font-bold text-gray-900">파일 Import</h1>
          <div></div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {['upload', 'mapping', 'preview', 'result'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['upload', 'mapping', 'preview', 'result'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-1"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="card max-w-lg mx-auto">
            <h2 className="text-lg font-semibold mb-4">1. 파일 업로드</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  파일 선택 (CSV, Excel)
                </label>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  파일 인코딩
                </label>
                <select
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value)}
                  className="input"
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="cp949">CP949 (한글 Windows)</option>
                  <option value="euc-kr">EUC-KR</option>
                </select>
              </div>

              {uploadError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {uploadError}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="btn-primary w-full"
              >
                {loading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && uploadResponse && (
          <div className="card max-w-lg mx-auto">
            <h2 className="text-lg font-semibold mb-4">2. 컬럼 매핑</h2>
            <p className="text-sm text-gray-500 mb-4">
              감지된 컬럼: {uploadResponse.detected_columns.join(', ')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜 컬럼 <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                  className="input"
                >
                  <option value="">선택하세요</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  금액 컬럼 <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.amount}
                  onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                  className="input"
                >
                  <option value="">선택하세요</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  유형 컬럼 (선택)
                </label>
                <select
                  value={columnMapping.type || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, type: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">자동 감지</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리 컬럼 (선택)
                </label>
                <select
                  value={columnMapping.category || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, category: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">없음</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  소분류 컬럼 (선택)
                </label>
                <select
                  value={columnMapping.subcategory || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, subcategory: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">없음</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계좌/카드 컬럼 (선택)
                </label>
                <select
                  value={columnMapping.account || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, account: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">없음</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">※ 없는 계좌/카드는 자동으로 생성됩니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모 컬럼 (선택)
                </label>
                <select
                  value={columnMapping.memo || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, memo: e.target.value || undefined })}
                  className="input"
                >
                  <option value="">없음</option>
                  {uploadResponse.detected_columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('upload')}
                  className="btn-secondary flex-1"
                >
                  이전
                </button>
                <button
                  onClick={handleConfirmMapping}
                  className="btn-primary flex-1"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && uploadResponse && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">3. 미리보기 및 옵션</h2>

            <div className="mb-6">
              <p className="text-sm text-gray-500">
                총 {uploadResponse.total_rows}개 행 중 처음 {uploadResponse.preview_rows.length}개 미리보기
              </p>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">날짜</th>
                    <th className="px-3 py-2 text-right">금액</th>
                    <th className="px-3 py-2 text-left">유형</th>
                    <th className="px-3 py-2 text-left">메모</th>
                    <th className="px-3 py-2 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResponse.preview_rows.map((row) => (
                    <tr key={row.row_number} className={row.error ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2">{row.row_number}</td>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2 text-right">{row.amount.toLocaleString()}원</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2 truncate max-w-32">{row.memo || '-'}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="text-red-600 text-xs">{row.error}</span>
                        ) : row.is_duplicate ? (
                          <span className="text-yellow-600 text-xs">중복</span>
                        ) : (
                          <span className="text-green-600 text-xs">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import Options */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Import 옵션</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기본 결제자 <span className="text-red-500">*</span>
                </label>
                <select
                  value={defaultPayerMemberId}
                  onChange={(e) => setDefaultPayerMemberId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">선택하세요</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user_name}
                    </option>
                  ))}
                </select>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기본 계좌 (선택)
                  </label>
                  <select
                    value={defaultAccountId}
                    onChange={(e) => setDefaultAccountId(e.target.value)}
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
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="skipDuplicates" className="text-sm text-gray-700">
                  중복 항목 건너뛰기
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => setStep('mapping')}
                className="btn-secondary flex-1"
              >
                이전
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading || !defaultPayerMemberId}
                className="btn-primary flex-1"
              >
                {loading ? 'Import 중...' : 'Import 실행'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && importResult && (
          <div className="card max-w-lg mx-auto text-center">
            <h2 className="text-lg font-semibold mb-4">4. Import 완료</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importResult.imported_count}</p>
                  <p className="text-sm text-green-700">성공</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{importResult.skipped_count}</p>
                  <p className="text-sm text-yellow-700">건너뜀</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{importResult.error_count}</p>
                  <p className="text-sm text-red-700">오류</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left bg-red-50 p-4 rounded-lg">
                  <p className="font-medium text-red-700 mb-2">오류 내역</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleReset}
                  className="btn-secondary flex-1"
                >
                  새로 Import
                </button>
                <Link href="/entries" className="btn-primary flex-1 text-center">
                  거래 내역 보기
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
