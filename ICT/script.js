//DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', function(){
    // 必要な情報をすべて取得する
    const boardScene = document.getElementById('board-scene');
    const formScene = document.getElementById('form-scene');

    const showFormBtn = document.getElementById('show-form-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    const taskInput = document.getElementById('task-input');
    const taskManager = document.getElementById('task-manager');
    const todoList = document.querySelector('.todo .task-list');

//画面切り替え処理
    //「＋」ボタンを押したとき
    showFormBtn.addEventListener('click', () => {
        boardScene.style.display = 'none';
        formScene.style.display = 'block';
    });

    //「戻る」ボタンを押したとき
    cancelBtn.addEventListener('click',() => {
        formScene.style.display = 'none';
        boardScene.style.display = 'block';
    });

    //タスク保存の処理
    saveBtn.addEventListener('click', () =>{
        const taskText = taskInput.value;
        const managerText = taskManager.value;

        if(taskText === "" || managerText === ""){
            alert("内容と担当者をどちらも入力してください！");
            return;
        }

        const newTaskCard = document.createElement('div');
        newTaskCard.classList.add('task-card','status-todo');

        newTaskCard.innerHTML =`
            <strong>${taskText}</strong>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color #666;">
                担当：${managerText}
            </p>
        `;

        todoList.appendChild(newTaskCard);

        taskInput.value = "";
        taskManager.value = "";
        formScene.style.display = 'none';
        boardScene.style.display = 'block'
    });

});