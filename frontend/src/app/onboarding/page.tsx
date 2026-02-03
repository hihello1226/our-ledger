'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { householdAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function OnboardingPage() {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const checkHousehold = async () => {
      try {
        const household = await householdAPI.get();
        if (household) {
          router.push('/dashboard');
        }
      } catch (err) {
        // User doesn't have a household yet, stay on this page
      }
    };
    if (user) {
      checkHousehold();
    }
  }, [user, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await householdAPI.create(householdName);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '가구 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await householdAPI.join(inviteCode);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '가구 참여에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">환영합니다!</h1>
          <p className="mt-2 text-center text-gray-600">가구를 만들거나 참여해주세요</p>
        </div>

        {mode === 'choice' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="card w-full text-left hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">새 가구 만들기</h3>
              <p className="text-gray-600 text-sm mt-1">
                가족과 함께 사용할 가계부를 만들어보세요
              </p>
            </button>

            <button
              onClick={() => setMode('join')}
              className="card w-full text-left hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">기존 가구 참여하기</h3>
              <p className="text-gray-600 text-sm mt-1">
                초대 코드로 가족의 가계부에 참여하세요
              </p>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form className="card space-y-6" onSubmit={handleCreate}>
            <h2 className="text-xl font-semibold text-gray-900">새 가구 만들기</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="householdName" className="block text-sm font-medium text-gray-700">
                가구 이름
              </label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="예: 우리집"
                className="input mt-1"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="btn btn-secondary flex-1"
              >
                뒤로
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form className="card space-y-6" onSubmit={handleJoin}>
            <h2 className="text-xl font-semibold text-gray-900">가구 참여하기</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                초대 코드
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="초대 코드 입력"
                className="input mt-1 uppercase"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="btn btn-secondary flex-1"
              >
                뒤로
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? '참여 중...' : '참여하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
