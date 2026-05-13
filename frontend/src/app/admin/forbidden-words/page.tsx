"use client";

import React, { useState, useEffect, useRef } from 'react';
import { environment } from '../../../config';
import { authorizedFetch } from '../../../utils/auth';

interface ForbiddenWord {
  id: number;
  pattern: string;
  active: boolean;
  category: string | null;
}

interface EditableWord {
  id?: number;
  pattern: string;
  type: 'WORD' | 'REGEX';
  category?: string;
  active?: boolean;
  _delete?: boolean;
}

interface ForbiddenWordsData {
  wordsByCategory: {
    [category: string]: ForbiddenWord[];
  };
  regexesByCategory: {
    [category: string]: ForbiddenWord[];
  };
}

export default function ForbiddenWordsPage() {
  const [data, setData] = useState<ForbiddenWordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingWords, setEditingWords] = useState<EditableWord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchForbiddenWords();
  }, []);

  const fetchForbiddenWords = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/forbidden-patterns`);

      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      } else {
        const errorText = await response.text();
        setError(`Błąd pobierania danych: ${errorText}`);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania słów zakazanych:', error);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchForbiddenWords();
  };

  const handleToggleStatus = async (word: ForbiddenWord) => {
    try {
      // Dodaj ID do listy aktualizowanych
      setUpdatingIds(prev => new Set(prev).add(word.id));

      const newStatus = !word.active;
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/admin/forbidden-patterns/${word.id}?active=${newStatus}`,
        {
          method: 'PATCH'
        }
      );

      if (response.ok) {
        // Aktualizuj lokalny stan
        setData(prevData => {
          if (!prevData) return null;

          const updateWordInCategory = (category: string, words: ForbiddenWord[]) => {
            return words.map(w => 
              w.id === word.id ? { ...w, active: newStatus } : w
            );
          };

          return {
            wordsByCategory: Object.fromEntries(
              Object.entries(prevData.wordsByCategory).map(([cat, words]) => [
                cat,
                updateWordInCategory(cat, words)
              ])
            ),
            regexesByCategory: Object.fromEntries(
              Object.entries(prevData.regexesByCategory).map(([cat, words]) => [
                cat,
                updateWordInCategory(cat, words)
              ])
            )
          };
        });
      } else {
        const errorText = await response.text();
        console.error('Błąd zmiany statusu:', errorText);
        // Można dodać toast notification tutaj
      }
    } catch (error) {
      console.error('Błąd podczas zmiany statusu:', error);
    } finally {
      // Usuń ID z listy aktualizowanych
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(word.id);
        return newSet;
      });
    }
  };

  const handleEditCategory = (category: string, isRegex: boolean = false) => {
    if (!data) return;

    const words = isRegex ? data.regexesByCategory[category] || [] : data.wordsByCategory[category] || [];
    const editableWords: EditableWord[] = words.map(word => ({
      id: word.id,
      pattern: word.pattern,
      type: isRegex ? 'REGEX' : 'WORD',
      category: word.category || undefined,
      active: word.active
    }));

    setEditingCategory(category);
    setEditingWords(editableWords);
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/forbidden-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingWords)
      });

      if (response.ok) {
        // Odśwież dane
        await fetchForbiddenWords();
        setIsEditing(false);
        setEditingCategory(null);
        setEditingWords([]);
      } else {
        const errorText = await response.text();
        console.error('Błąd zapisywania:', errorText);
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingCategory(null);
    setEditingWords([]);
  };

  const handleAddWord = () => {
    const newWord: EditableWord = {
      pattern: '',
      type: editingCategory && data?.regexesByCategory[editingCategory] ? 'REGEX' : 'WORD',
      category: editingCategory || undefined,
      active: true
    };
    setEditingWords([...editingWords, newWord]);
  };

  const handleUpdateWord = (index: number, field: keyof EditableWord, value: string | boolean) => {
    const updated = [...editingWords];
    updated[index] = { ...updated[index], [field]: value };
    setEditingWords(updated);
  };

  const handleDeleteWord = (index: number) => {
    const word = editingWords[index];
    if (word.id) {
      // Oznacz jako do usunięcia
      const updated = [...editingWords];
      updated[index] = { ...updated[index], _delete: true };
      setEditingWords(updated);
    } else {
      // Usuń z listy (nowe słowo)
      const updated = editingWords.filter((_, i) => i !== index);
      setEditingWords(updated);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie słów zakazanych...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Błąd</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderWordsSection = (title: string, words: ForbiddenWord[], isRegex: boolean = false) => {
    if (!words || words.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
          <p className="text-gray-500">Brak słów w tej kategorii</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
          <button
            onClick={() => handleEditCategory(title.replace('Kategoria: ', ''), isRegex)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Edytuj
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {words.map((word) => (
            <div key={word.id} className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded flex-1 truncate">
                  {word.pattern}
                </span>
                {isRegex && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
                    REGEX
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  ID: {word.id}
                </div>
                <button
                  onClick={() => handleToggleStatus(word)}
                  disabled={updatingIds.has(word.id)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
                    word.active 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {updatingIds.has(word.id) ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>...</span>
                    </div>
                  ) : (
                    word.active ? 'Aktywne' : 'Nieaktywne'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Słowa zakazane</h1>
            <p className="text-gray-600 mt-2">Zarządzanie słowami i wyrażeniami zakazanymi</p>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Odśwież
          </button>
        </div>
      </div>

      {/* Content */}
      {data ? (
        <div className="space-y-8">
          {/* Słowa zakazane */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Słowa zakazane</h2>
            <div className="space-y-6">
              {Object.entries(data.wordsByCategory).map(([category, words]) => (
                <div key={category}>
                  {renderWordsSection(
                    `Kategoria: ${category}`,
                    words,
                    false
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wyrażenia regularne */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Wyrażenia regularne</h2>
            <div className="space-y-6">
              {Object.entries(data.regexesByCategory).map(([category, regexes]) => (
                <div key={category}>
                  {renderWordsSection(
                    `Kategoria: ${category}`,
                    regexes,
                    true
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Brak danych do wyświetlenia</p>
        </div>
      )}

      {/* Modal edycji */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edytuj kategorię: {editingCategory}
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                {editingWords.map((word, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${word._delete ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Wzorzec
                        </label>
                        <input
                          type="text"
                          value={word.pattern}
                          onChange={(e) => handleUpdateWord(index, 'pattern', e.target.value)}
                          disabled={word._delete}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          placeholder="Wprowadź wzorzec..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Typ
                        </label>
                        <select
                          value={word.type}
                          onChange={(e) => handleUpdateWord(index, 'type', e.target.value as 'WORD' | 'REGEX')}
                          disabled={word._delete}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          <option value="WORD">Słowo</option>
                          <option value="REGEX">Regex</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={word.active}
                              onChange={(e) => handleUpdateWord(index, 'active', e.target.checked)}
                              disabled={word._delete}
                              className="mr-2"
                            />
                            Aktywne
                          </label>
                          <button
                            onClick={() => handleDeleteWord(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            {word._delete ? 'Przywróć' : 'Usuń'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {word._delete && (
                      <div className="mt-2 text-sm text-red-600">
                        ⚠️ Ten wpis zostanie usunięty
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleAddWord}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  + Dodaj nowe słowo
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
