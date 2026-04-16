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

let isSignUpMode = false; // 現在が「ログイン」か「新規登録」かを管理

// 1. ログインと新規登録の見た目を切り替える処理
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    
    authTitle.textContent = isSignUpMode ? "新規登録" : "ログイン";
    authSubmitBtn.textContent = isSignUpMode ? "登録" : "ログイン";
    toggleLink.textContent = isSignUpMode ? "ログインに戻る" : "新規アカウント作成はこちら";
    
    // パスワードマネージャーが「新しいパスワード」として認識できるように属性を変更
    passwordInput.autocomplete = isSignUpMode ? "new-password" : "current-password";
});

// 2. フォーム送信時の処理
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        // --- 新規登録 ---
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            alert("登録エラー: " + error.message);
        } else {
            alert("登録できました、次にログイン画面に進んでください");
        }
    } else {
        // --- ログイン ---
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert("ログイン失敗: " + error.message);
        } else {
            // ログイン成功したらメイン画面（index.html）へ移動
            window.location.href = 'index.html';
        }
    }
});