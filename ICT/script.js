document.addEventListener('DOMContentLoaded', function(){
    // 要素の取得
    const boardScene = document.getElementById('board-scene');
    const formScene = document.getElementById('form-scene');

    const showFormBtn = document.getElementById('show-form-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date'); // 期日入力欄を追加
    const taskManager = document.getElementById('task-manager');
    const todoList = document.querySelector('.todo .task-list');

    // 画面切り替え：追加ボタン
    showFormBtn.addEventListener('click', () => {
        boardScene.style.display = 'none';
        formScene.style.display = 'block';
    });

    // 画面切り替え：戻るボタン
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault(); // フォーム送信（リロード）を防ぐ
        formScene.style.display = 'none';
        boardScene.style.display = 'block';
    });

    // タスク保存の処理
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault(); // フォームのデフォルトの動きを止める

        const taskText = taskInput.value;
        const managerText = taskManager.value;
        const dateText = taskDate.value; // 期日の値を取得

        // バリデーション（入力チェック）
        if(taskText === "" || managerText === ""){
            alert("内容と担当者をどちらも入力してください！");
            return;
        }

        // 新しいタスクカードの作成
       const newTaskCard = document.createElement('div');
        newTaskCard.classList.add('task-card','status-todo');
        newTaskCard.setAttribute('draggable', 'true'); // ドラッグ可能にする

        // 中身のHTMLはそのまま
        newTaskCard.innerHTML = `...`; 

        // ★ ここでドラッグイベントを登録する関数を呼ぶ
        addDragEvents(newTaskCard);

        todoList.appendChild(newTaskCard);

        // カードの中身を構築（期日も表示するように追加）
        newTaskCard.innerHTML = `
            <strong>${taskText}</strong>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #666;">
                担当：${managerText}
            </p>
            ${dateText ? `<p style="margin: 2px 0 0 0; font-size: 0.8em; color: #cc0000;">期日：${dateText}</p>` : ''}
        `;

        // 未着手リストに追加
        todoList.appendChild(newTaskCard);

        // 入力欄をリセットして画面を戻す
        taskInput.value = "";
        taskManager.value = "";
        taskDate.value = "";
        formScene.style.display = 'none';
        boardScene.style.display = 'block';
    });

    // --- ドラッグ＆ドロップ機能の追加 ---

// 1. ドラッグ中の要素を保持する変数
let draggedItem = null;

// 2. タスクリスト（列）に対してドロップを受け入れる設定
const lists = document.querySelectorAll('.task-list');

lists.forEach(list => {
    // 列の上に重なったとき（これがないとドロップできない）
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    // 列に入ったとき
    list.addEventListener('dragenter', (e) => {
        e.preventDefault();
        list.style.backgroundColor = "rgba(0, 0, 0, 0.1)"; // 少し色を変える
    });

    // 列から離れたとき
    list.addEventListener('dragleave', () => {
        list.style.backgroundColor = "";
    });

    // ドロップしたとき
    list.addEventListener('drop', () => {
        list.style.backgroundColor = "";
        list.appendChild(draggedItem); // ドラッグ中の要素をこの列に移動
    });
});

// 3. 新しく作るカードにドラッグイベントを設定する関数
function addDragEvents(item) {
    item.addEventListener('dragstart', () => {
        draggedItem = item; // ドラッグ開始した要素を記録
        setTimeout(() => {
            item.style.display = "none"; // ドラッグ中、元の場所で非表示にする
        }, 0);
    });

    item.addEventListener('dragend', () => {
        setTimeout(() => {
            item.style.display = "block"; // ドラッグ終了後に表示
            draggedItem = null;
        }, 0);
    });
}

// 既存のタスクカード（最初からHTMLにある分）にもイベントをつける
document.querySelectorAll('.task-card').forEach(card => {
    card.setAttribute('draggable', 'true');
    addDragEvents(card);
});
});