// auth-script.js
import { SUPABASE_CONFIG } from './config.js';

// Supabaseクライアントの初期化
const supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleLink = document.getElementById('toggle-link');

let isSignUpMode = false; 
let isProfileSettingMode = false; // プロフィール設定中かどうかのフラグ

// 1. ログイン/新規登録の切り替え
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (isProfileSettingMode) return; // プロフィール設定中は切り替え不可

    isSignUpMode = !isSignUpMode;
    authTitle.textContent = isSignUpMode ? "新規登録" : "ログイン";
    authSubmitBtn.textContent = isSignUpMode ? "登録" : "ログイン";
    toggleLink.textContent = isSignUpMode ? "ログインに戻る" : "新規アカウント作成はこちら";
    passwordInput.parentElement.style.display = "block";
    passwordInput.autocomplete = isSignUpMode ? "new-password" : "current-password";
});

// 2. フォーム送信時の処理
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    // --- A. プロフィール設定モードの時 ---
    if (isProfileSettingMode) {
        const username = document.getElementById('username-input').value;
        const { data: { user } } = await supabaseClient.auth.getUser();

        const { error } = await supabaseClient
            .from('profiles')
            .insert([{ id: user.id, username: username }]);

        if (error) {
            alert("このユーザー名は既に使用されているか、エラーが発生しました: " + error.message);
        } else {
            alert("設定完了！アプリを開始します。");
            window.location.href = 'index.html';
        }
        return;
    }

    // --- B. 新規登録モードの時 ---
    if (isSignUpMode) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            alert("登録エラー: " + error.message);
        } else {
            alert("アカウントを作成しました。次に表示名を設定してください。");
            switchToProfileMode();
        }
    } 
    // --- C. ログインモードの時 ---
    else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert("ログインエラー: " + error.message);
        } else {
            // ログイン後、プロフィールが既に存在するかチェック
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('username')
                .eq('id', data.user.id)
                .single();

            if (!profile) {
                switchToProfileMode(); // プロフィールがなければ設定画面へ
            } else {
                window.location.href = 'index.html';
            }
        }
    }
});

// プロフィール設定画面にUIを切り替える関数
function switchToProfileMode() {
    isProfileSettingMode = true;
    authTitle.textContent = "プロフィール設定";
    authSubmitBtn.textContent = "設定を完了して開始";
    toggleLink.style.display = "none"; // 切り替えリンクを隠す

    // メアド・パスワード欄を隠し、ユーザー名入力欄を追加
    emailInput.parentElement.style.display = "none";
    passwordInput.parentElement.style.display = "none";

    const profileGroup = document.createElement('div');
    profileGroup.className = 'form-group';
    profileGroup.innerHTML = `
        <label for="username-input">表示名（ニックネーム）</label>
        <input type="text" id="username-input" placeholder="例：山田太郎" required>
    `;
    authForm.insertBefore(profileGroup, authSubmitBtn);
}