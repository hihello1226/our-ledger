'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { categoriesAPI, Category, Subcategory } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesAPI.list();
        setCategories(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchCategories();
    }
  }, [user]);

  const resetForm = () => {
    setFormName('');
    setFormType('expense');
    setFormError('');
    setEditingCategory(null);
    setEditingSubcategory(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, { name: formName, type: formType });
      } else {
        await categoriesAPI.create({ name: formName, type: formType });
      }
      const data = await categoriesAPI.list();
      setCategories(data);
      setShowCategoryForm(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (editingSubcategory) {
        await categoriesAPI.updateSubcategory(editingSubcategory.id, { name: formName });
      } else {
        await categoriesAPI.createSubcategory(categoryId, { name: formName });
      }
      const data = await categoriesAPI.list();
      setCategories(data);
      setShowSubcategoryForm(null);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까? 소분류도 함께 삭제됩니다.')) return;

    try {
      await categoriesAPI.delete(id);
      const data = await categoriesAPI.list();
      setCategories(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('이 소분류를 삭제하시겠습니까?')) return;

    try {
      await categoriesAPI.deleteSubcategory(id);
      const data = await categoriesAPI.list();
      setCategories(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormType(category.type as 'expense' | 'income');
    setShowCategoryForm(true);
  };

  const openEditSubcategory = (subcategory: Subcategory, categoryId: string) => {
    setEditingSubcategory(subcategory);
    setFormName(subcategory.name);
    setShowSubcategoryForm(categoryId);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &lt; 대시보드
          </Link>
          <h1 className="text-xl font-bold text-gray-900">카테고리 관리</h1>
          <button
            onClick={() => {
              resetForm();
              setShowCategoryForm(true);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            + 추가
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 지출 카테고리 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-red-600">지출 카테고리</h2>
          <div className="space-y-3">
            {expenseCategories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <span className="font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        resetForm();
                        setShowSubcategoryForm(category.id);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + 소분류
                    </button>
                    {category.household_id && (
                      <>
                        <button
                          onClick={() => openEditCategory(category)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {category.subcategories.length > 0 && (
                  <div className="p-3 space-y-2">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between pl-4 text-sm">
                        <span className="text-gray-600">└ {sub.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditSubcategory(sub, category.id)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(sub.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Subcategory Form */}
                {showSubcategoryForm === category.id && (
                  <form
                    onSubmit={(e) => handleCreateSubcategory(e, category.id)}
                    className="p-3 border-t bg-blue-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="소분류 이름"
                        className="input flex-1"
                        required
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="btn-primary px-3 py-2 text-sm"
                      >
                        {editingSubcategory ? '수정' : '추가'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubcategoryForm(null);
                          resetForm();
                        }}
                        className="btn-secondary px-3 py-2 text-sm"
                      >
                        취소
                      </button>
                    </div>
                    {formError && (
                      <p className="text-red-500 text-xs mt-1">{formError}</p>
                    )}
                  </form>
                )}
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">지출 카테고리가 없습니다</p>
            )}
          </div>
        </div>

        {/* 수입 카테고리 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-green-600">수입 카테고리</h2>
          <div className="space-y-3">
            {incomeCategories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <span className="font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        resetForm();
                        setShowSubcategoryForm(category.id);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + 소분류
                    </button>
                    {category.household_id && (
                      <>
                        <button
                          onClick={() => openEditCategory(category)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {category.subcategories.length > 0 && (
                  <div className="p-3 space-y-2">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between pl-4 text-sm">
                        <span className="text-gray-600">└ {sub.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditSubcategory(sub, category.id)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(sub.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Subcategory Form */}
                {showSubcategoryForm === category.id && (
                  <form
                    onSubmit={(e) => handleCreateSubcategory(e, category.id)}
                    className="p-3 border-t bg-blue-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="소분류 이름"
                        className="input flex-1"
                        required
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="btn-primary px-3 py-2 text-sm"
                      >
                        {editingSubcategory ? '수정' : '추가'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubcategoryForm(null);
                          resetForm();
                        }}
                        className="btn-secondary px-3 py-2 text-sm"
                      >
                        취소
                      </button>
                    </div>
                    {formError && (
                      <p className="text-red-500 text-xs mt-1">{formError}</p>
                    )}
                  </form>
                )}
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">수입 카테고리가 없습니다</p>
            )}
          </div>
        </div>
      </main>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? '카테고리 수정' : '새 카테고리'}
            </h2>

            {formError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="카테고리 이름"
                  className="input mt-1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">유형</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormType('expense')}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      formType === 'expense'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    지출
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('income')}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      formType === 'income'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    수입
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary flex-1"
                >
                  {formLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
