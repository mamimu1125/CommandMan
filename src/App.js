// App.js
import React, { useState, useEffect } from 'react';
import { Search, Plus, Copy, Star, Trash2, Edit2, Save, X, Terminal, Settings, Database } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

// Firebase設定を入力してください
const firebaseConfig = {
  apiKey: "AIzaSyDMzrK88cr0eZFXWK3NrU_x69zSmIwbRO4",
  authDomain: "command-man.firebaseapp.com",
  projectId: "command-man",
  storageBucket: "command-man.firebasestorage.app",
  messagingSenderId: "105993896504",
  appId: "1:105993896504:web:151958e3433ec056e19ccd"
};

function App() {
  const [commands, setCommands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 管理者のメールアドレス（あなたのGoogleアカウント）
  const ADMIN_EMAIL = "mamimu1125@gmail.com";

  const [newCommand, setNewCommand] = useState({
    name: '',
    command: '',
    description: '',
    category: 'git',
    favorite: false
  });
  const [newCategory, setNewCategory] = useState('');

  // Firebase初期化
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authentication = getAuth(app);

        setDb(firestore);
        setAuth(authentication);

        // 認証状態の監視
        onAuthStateChanged(authentication, (user) => {
          if (user) {
            setUser(user);
            setIsConfigured(true);
            setIsAdmin(user.email === ADMIN_EMAIL);
            loadData(firestore);
          } else {
            setUser(null);
            setIsAdmin(false);
            setIsConfigured(true);
            loadData(firestore); // 未ログインでも閲覧可能
          }
        });
      } catch (error) {
        console.error('Firebase初期化エラー:', error);
        initializeLocalData();
      }
    };

    initFirebase();
  }, []);

  // ローカルデータ初期化
  const initializeLocalData = () => {
    const initialCategories = [
      { id: 'git', name: 'Git' },
      { id: 'react', name: 'React' }
    ];
    setCategories(initialCategories);

    const initialCommands = [
      {
        id: '1',
        name: 'Git Status',
        command: 'git status',
        description: 'リポジトリの状態を確認',
        category: 'git',
        favorite: true
      },
      {
        id: '2',
        name: 'Git Add All',
        command: 'git add .',
        description: '全ての変更をステージング',
        category: 'git',
        favorite: false
      },
      {
        id: '3',
        name: 'React Dev Server',
        command: 'npm start',
        description: 'React開発サーバーを起動',
        category: 'react',
        favorite: true
      },
      {
        id: '4',
        name: 'React Build',
        command: 'npm run build',
        description: 'Reactアプリをビルド',
        category: 'react',
        favorite: false
      }
    ];
    setCommands(initialCommands);
  };

  // Firebaseからデータ読み込み
  const loadData = async (firestore) => {
    try {
      // コマンド読み込み
      const commandsSnapshot = await getDocs(collection(firestore, 'commands'));
      const firebaseCommands = commandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // カテゴリ読み込み
      const categoriesSnapshot = await getDocs(collection(firestore, 'categories'));
      const firebaseCategories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // データが存在すれば読み込む（初期データ追加は一度だけ）
      setCommands(firebaseCommands);
      setCategories(firebaseCategories);
      
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  // フィルタリング
  const filteredCommands = commands.filter(cmd => {
    const matchesSearch = cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cmd.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // コマンド追加
  const handleAddCommand = async () => {
    if (newCommand.name && newCommand.command) {
      try {
        if (isConfigured && db) {
          await addDoc(collection(db, 'commands'), newCommand);
          loadData(db);
        } else {
          const command = { ...newCommand, id: Date.now().toString() };
          setCommands([...commands, command]);
        }
        
        setNewCommand({ name: '', command: '', description: '', category: categories[0]?.id || 'git', favorite: false });
        setShowAddForm(false);
      } catch (error) {
        console.error('コマンド追加エラー:', error);
      }
    }
  };

  // コマンド更新
  const handleUpdateCommand = async () => {
    try {
      if (isConfigured && db) {
        await updateDoc(doc(db, 'commands', editingId), newCommand);
        loadData(db);
      } else {
        setCommands(commands.map(cmd => 
          cmd.id === editingId ? { ...newCommand, id: editingId } : cmd
        ));
      }
      
      setNewCommand({ name: '', command: '', description: '', category: categories[0]?.id || 'git', favorite: false });
      setShowAddForm(false);
      setEditingId(null);
    } catch (error) {
      console.error('コマンド更新エラー:', error);
    }
  };

  // コマンド削除
  const handleDeleteCommand = async (id) => {
    try {
      if (isConfigured && db) {
        await deleteDoc(doc(db, 'commands', id));
        loadData(db);
      } else {
        setCommands(commands.filter(cmd => cmd.id !== id));
      }
    } catch (error) {
      console.error('コマンド削除エラー:', error);
    }
  };

  // カテゴリ追加
  const handleAddCategory = async () => {
    if (newCategory && !categories.find(cat => cat.id === newCategory.toLowerCase().replace(/\s+/g, '-'))) {
      const category = {
        id: newCategory.toLowerCase().replace(/\s+/g, '-'),
        name: newCategory
      };
      
      try {
        if (isConfigured && db) {
          await addDoc(collection(db, 'categories'), category);
          loadData(db);
        } else {
          setCategories([...categories, category]);
        }
        
        setNewCategory('');
        setShowCategoryForm(false);
      } catch (error) {
        console.error('カテゴリ追加エラー:', error);
      }
    }
  };

  // カテゴリ削除
  const handleDeleteCategory = async (categoryId) => {
    // 一時的に制限を緩和
    if (categories.length > 0) {
      try {
        if (isConfigured && db) {
          // Document IDではなく、category.idで一致するドキュメントを探して削除
          const categoryToDelete = categories.find(cat => cat.id === categoryId);
          if (categoryToDelete && categoryToDelete.firebaseId) {
            await deleteDoc(doc(db, 'categories', categoryToDelete.firebaseId));
          } else {
            // バックアップ: 全カテゴリを取得して削除
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            categoriesSnapshot.docs.forEach(async (docSnapshot) => {
              const data = docSnapshot.data();
              if (data.id === categoryId) {
                await deleteDoc(doc(db, 'categories', docSnapshot.id));
              }
            });
          }
          loadData(db);
        } else {
          setCategories(categories.filter(cat => cat.id !== categoryId));
          const firstCategoryId = categories.find(cat => cat.id !== categoryId)?.id;
          if (firstCategoryId) {
            setCommands(commands.map(cmd => 
              cmd.category === categoryId ? { ...cmd, category: firstCategoryId } : cmd
            ));
          }
        }
        
        if (selectedCategory === categoryId) {
          setSelectedCategory('all');
        }
      } catch (error) {
        console.error('カテゴリ削除エラー:', error);
      }
    }
  };

  // お気に入り切り替え
  const toggleFavorite = async (id) => {
    const command = commands.find(cmd => cmd.id === id);
    const updatedCommand = { ...command, favorite: !command.favorite };
    
    try {
      if (isConfigured && db) {
        await updateDoc(doc(db, 'commands', id), updatedCommand);
        loadData(db);
      } else {
        setCommands(commands.map(cmd => 
          cmd.id === id ? updatedCommand : cmd
        ));
      }
    } catch (error) {
      console.error('お気に入り更新エラー:', error);
    }
  };

  // 編集開始
  const handleEditCommand = (id) => {
    const command = commands.find(cmd => cmd.id === id);
    setNewCommand(command);
    setEditingId(id);
    setShowAddForm(true);
  };

  // ログイン
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました');
    }
  };

  // ログアウト
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // コピー
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch (err) {
      console.error('コピー失敗:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8 border-b border-gray-300 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">コマンド管理</h1>
              <p className="text-gray-600">
                {isConfigured ? 'Firebaseに保存中' : 'ローカル（一時的）'}
                {user && ` - ${isAdmin ? '管理者' : 'ゲスト'}として${user.displayName || user.email}でログイン中`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isConfigured && (
                <div className="flex items-center text-green-600 text-sm">
                  <Database className="w-4 h-4 mr-1" />
                  接続済み
                </div>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:border-black"
                >
                  ログアウト
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  管理者ログイン
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 検索 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* カテゴリとボタン */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm border rounded ${
              selectedCategory === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            すべて
          </button>
          {categories.map(category => (
            <div key={category.id} className="flex items-stretch">
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 text-sm border rounded-l ${
                  selectedCategory === category.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-black'
                }`}
              >
                {category.name}
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="px-2 py-1 text-sm border-r border-t border-b border-gray-300 hover:border-gray-500 rounded-r bg-gray-500 text-white hover:bg-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {isAdmin && (
            <button
              onClick={() => setShowCategoryForm(true)}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:border-black"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* カテゴリ追加フォーム */}
        {showCategoryForm && isAdmin && (
          <div className="mb-6 p-4 border border-gray-300 rounded">
            <h3 className="text-lg font-semibold mb-3">新しいカテゴリ</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="カテゴリ名"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategory('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:border-black"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* コマンド追加ボタン */}
        {isAdmin && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              コマンド追加
            </button>
          </div>
        )}

        {/* コマンド追加/編集フォーム */}
        {showAddForm && isAdmin && (
          <div className="mb-6 p-4 border border-gray-300 rounded">
            <h3 className="text-lg font-semibold mb-3">
              {editingId ? 'コマンド編集' : 'コマンド追加'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="コマンド名"
                value={newCommand.name}
                onChange={(e) => setNewCommand({...newCommand, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
              />
              <input
                type="text"
                placeholder="コマンド"
                value={newCommand.command}
                onChange={(e) => setNewCommand({...newCommand, command: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black font-mono"
              />
              <textarea
                placeholder="説明"
                value={newCommand.description}
                onChange={(e) => setNewCommand({...newCommand, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
                rows="2"
              />
              <select
                value={newCommand.category}
                onChange={(e) => setNewCommand({...newCommand, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newCommand.favorite}
                  onChange={(e) => setNewCommand({...newCommand, favorite: e.target.checked})}
                  className="mr-2"
                />
                お気に入り
              </label>
              <div className="flex gap-2">
                <button
                  onClick={editingId ? handleUpdateCommand : handleAddCommand}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                >
                  {editingId ? '更新' : '追加'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewCommand({ name: '', command: '', description: '', category: categories[0]?.id || 'git', favorite: false });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:border-black"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* コマンド一覧 */}
        <div className="space-y-3">
          {filteredCommands.map(cmd => (
            <div key={cmd.id} className="border border-gray-300 rounded p-4 hover:border-black transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <h3 className="font-semibold">{cmd.name}</h3>
                  {cmd.favorite && (
                    <Star className="w-4 h-4 ml-2 text-black fill-current" />
                  )}
                </div>
                <div className="flex gap-1">
                  {isAdmin && (
                    <button
                      onClick={() => toggleFavorite(cmd.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Star className={`w-4 h-4 ${cmd.favorite ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEditCommand(cmd.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCommand(cmd.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-gray-100 rounded p-2 mb-2">
                <code className="font-mono text-sm flex-1">{cmd.command}</code>
                <button
                  onClick={() => copyToClipboard(cmd.command)}
                  className="p-1 hover:bg-gray-200 rounded ml-2"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              
              {cmd.description && (
                <p className="text-gray-600 text-sm">{cmd.description}</p>
              )}
            </div>
          ))}
        </div>

        {filteredCommands.length === 0 && (
          <div className="text-center py-8">
            <Terminal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">コマンドが見つかりません</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;