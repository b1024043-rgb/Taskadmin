document.addEventListener('DOMContentLoaded', function(){
    // Firebaseの関数をwindowから取得
    const { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } = window.fb;
    const db = window.db;
    const tasksCollection = collection(db, "tasks");

    // 要素の取得
    const boardScene = document.getElementById('board-scene');
    const formScene = document.getElementById('form-scene');
    const showFormBtn = document.getElementById('show-form-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskManager = document.getElementById('task-manager');
    const taskPriority = document.getElementById('task-priority');

    // --- リアルタイム反映 (onSnapshot) ---
    onSnapshot(query(tasksCollection, orderBy("createdAt", "desc")), (snapshot) => {
        document.getElementById('todo-list').innerHTML = "";
        document.getElementById('doing-list').innerHTML = "";
        document.getElementById('done-list').innerHTML = "";

        snapshot.forEach((docSnap) => {
            const task = docSnap.data();
            renderTaskCard(task, docSnap.id);
        });
    });

    // 画面切り替え：追加ボタン
    showFormBtn.addEventListener('click', () => {
        boardScene.style.display = 'none';
        formScene.style.display = 'block';
    });

    // 画面切り替え：戻るボタン
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        formScene.style.display = 'none';
        boardScene.style.display = 'block';
    });

    // タスク保存の処理 (Firebaseへ追加)
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const taskText = taskInput.value;
        const managerText = taskManager.value;
        const dateText = taskDate.value;
        const priorityText = taskPriority ? taskPriority.value : "middle";

        if(taskText === "" || managerText === ""){
            alert("内容と担当者をどちらも入力してください！");
            return;
        }

        await addDoc(tasksCollection, {
            title: taskText,
            manager: managerText,
            date: dateText,
            priority: priorityText,
            status: "todo",
            createdAt: new Date()
        });

        taskInput.value = "";
        taskManager.value = "";
        taskDate.value = "";
        formScene.style.display = 'none';
        boardScene.style.display = 'block';
    });

    // カードを描画する補助関数（★ここでボタンを復活）
    function renderTaskCard(data, id) {
        const newTaskCard = document.createElement('div');
        newTaskCard.classList.add('task-card', `status-${data.status}`);
        newTaskCard.setAttribute('draggable', 'true');
        newTaskCard.dataset.id = id;

        // 優先度バッジの作成（もしデータにあれば）
        const priorityBadge = data.priority ? `<span class="priority-badge ${data.priority}">${data.priority === 'high' ? '高' : data.priority === 'low' ? '低' : '中'}</span>` : '';

        // 元のHTML書式に合わせて編集ボタンを復活
        newTaskCard.innerHTML = `
            <div class="task-body">
                ${priorityBadge}
                <strong>${data.title}</strong>
                <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #666;">担当：${data.manager}</p>
                ${data.date ? `<p style="margin: 2px 0 0 0; font-size: 0.8em; color: #cc0000;">期日：${data.date}</p>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-btn">編集</button>
                <button class="delete-btn">削除</button>
            </div>
        `;

        // 削除ボタンの処理
        newTaskCard.querySelector('.delete-btn').addEventListener('click', async () => {
            if(confirm("このタスクを削除しますか？")) {
                await deleteDoc(doc(db, "tasks", id));
            }
        });

        // 編集ボタンの処理（※現時点ではアラートのみ。必要に応じて編集機能を実装）
        newTaskCard.querySelector('.edit-btn').addEventListener('click', () => {
            alert("編集機能は今後のアップデートで実装予定です！");
        });

        addDragEvents(newTaskCard);

        const targetList = document.getElementById(`${data.status}-list`);
        if(targetList) targetList.appendChild(newTaskCard);
    }

    // --- ドラッグ＆ドロップ ---
    let draggedItem = null;
    const lists = document.querySelectorAll('.task-list');

    lists.forEach(list => {
        list.addEventListener('dragover', (e) => e.preventDefault());
        list.addEventListener('dragenter', (e) => {
            e.preventDefault();
            list.classList.add('drag-over');
        });
        list.addEventListener('dragleave', () => {
            list.classList.remove('drag-over');
        });
        list.addEventListener('drop', async () => {
            list.classList.remove('drag-over');
            if(draggedItem) {
                const taskId = draggedItem.dataset.id;
                const newStatus = list.id.replace('-list', '');

                if (taskId) {
                    try {
                        await updateDoc(doc(db, "tasks", taskId), {
                            status: newStatus
                        });
                    } catch (error) {
                        console.error("ステータス更新エラー:", error);
                    }
                }
            }
        });
    });

    function addDragEvents(item) {
        item.addEventListener('dragstart', () => {
            draggedItem = item;
            setTimeout(() => { item.style.display = "none"; }, 0);
        });
        item.addEventListener('dragend', () => {
            setTimeout(() => {
                item.style.display = "block";
                draggedItem = null;
            }, 0);
        });
    }
});