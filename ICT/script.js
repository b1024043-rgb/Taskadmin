import { SUPABASE_CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', function(){
    // config.js から読み込んだ値を使用
    const supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    // ★ 挙動を安定させるためのフラグ管理
    let isSelfUpdating = false; 
    // ★ ユーザー情報を保持する変数（認証待ちによるチラつきを防止）
    let currentUser = null;

    // --- 追加：ログインチェックロジック ---
    async function checkUser() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }

        // ★ ログイン成功時にユーザー情報を変数に入れておく
        currentUser = session.user;
        
        const boardScene = document.getElementById('board-scene');
        if (boardScene) {
            boardScene.style.display = 'flex'; 
        }

        loadTasks();
    }
    checkUser();

    // --- 追加：ログアウト処理 ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('ログアウトエラー:', error);
            } else {
                window.location.href = 'auth.html';
            }
        });
    }

    // 要素の取得
    const boardScene = document.getElementById('board-scene');
    const formScene = document.getElementById('form-scene');
    const showFormBtn = document.getElementById('show-form-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskManager = document.getElementById('task-manager');

    // --- 1. データを読み込んで画面に表示する関数 ---
    async function loadTasks() {
        // 自分が更新した直後（isSelfUpdatingがtrue）は、リアルタイム通知による再描画をスキップする
        if (isSelfUpdating) return;

        const { data: tasks, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('データ取得エラー:', error);
            return;
        }

        // ★ 高速化のため、ここで await getUser() をせず currentUser を使う
        if (!currentUser) return;

        document.getElementById('todo-list').innerHTML = "";
        document.getElementById('doing-list').innerHTML = "";
        document.getElementById('done-list').innerHTML = "";

        tasks.forEach(task => {
            renderTaskCard(task, currentUser);
        });
    }

    // --- 2. タスクカードを作成して画面に追加する関数 ---
    function renderTaskCard(task, user) {
        const listId = `${task.status}-list`;
        const listEl = document.getElementById(listId);
        if (!listEl) return;

        const card = document.createElement('div');
        card.className = 'task-card';
        
        const isOwner = task.user_id === user.id;
        card.draggable = isOwner;
        card.dataset.id = task.id;

        let priorityLabel = "中";
        if(task.priority === "high") priorityLabel = "高";
        if(task.priority === "low") priorityLabel = "低";
        
        card.innerHTML = `
            <div class="task-body">
                <div class="priority-badge ${task.priority}">${priorityLabel}</div>
                <strong>${task.title}</strong><br>
                <small>期限: ${task.due_date || '未設定'}</small><br>
                <small>担当: ${task.manager}</small>
            </div>
            <div class="task-actions">
                ${isOwner ? `
                    <button class="edit-btn" data-id="${task.id}">編集</button>
                    <button class="delete-btn" data-id="${task.id}">削除</button>
                ` : '<small style="color:#999; font-size:10px;">閲覧のみ</small>'}
            </div>
        `;

        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('このタスクを削除しますか？')) {
                    isSelfUpdating = true; // 通知を無視
                    const { error } = await supabaseClient
                        .from('tasks')
                        .delete()
                        .eq('id', task.id);

                    if (error) {
                        alert('削除に失敗しました');
                        isSelfUpdating = false;
                    } else {
                        // 削除時は再描画せず、その場でカードを消すとよりスムーズ
                        card.remove();
                        // 通知が落ち着く頃に解除
                        setTimeout(() => { isSelfUpdating = false; }, 1000);
                    }
                }
            });
        }

        addDragEvents(card);
        listEl.appendChild(card);
    }

    // --- 3. リアルタイム同期の設定 ---
    supabaseClient
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            // 他の人が変更した時だけ反映されるように、loadTasks内のフラグで制御
            loadTasks();
        })
        .subscribe();

    showFormBtn.addEventListener('click', () => {
        boardScene.style.display = 'none';
        formScene.style.display = 'block';
    });

    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        formScene.style.display = 'none';
        boardScene.style.display = 'flex';
    });

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const title = taskInput.value;
        const manager = taskManager.value;
        const due_date = taskDate.value;
        const priorityEl = document.querySelector('input[name="priority"]:checked');
        const priority = priorityEl ? priorityEl.value : 'middle';

        if (!title || !manager) {
            alert("内容と担当者は必須です");
            return;
        }

        // ★ currentUser を使用
        if (!currentUser) return;

        isSelfUpdating = true; // 追加時の通知をブロック
        const { error } = await supabaseClient
            .from('tasks')
            .insert([{ 
                title, manager, due_date, priority, 
                status: 'todo', user_id: currentUser.id 
            }]);

        if (error) {
            console.error("保存エラー:", error);
            isSelfUpdating = false;
        } else {
            taskInput.value = "";
            taskManager.value = ""; 
            taskDate.value = "";
            formScene.style.display = 'none';
            boardScene.style.display = 'flex';
            
            // 自分の追加後、通知が届き終わるまで待ってからフラグ解除
            setTimeout(() => {
                isSelfUpdating = false;
                loadTasks();
            }, 800);
        }
    });

    // --- ドラッグ＆ドロップロジック ---
    let draggedItem = null;
    const lists = document.querySelectorAll('.task-list');

    lists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.style.backgroundColor = "rgba(0,0,0,0.1)";
        });

        list.addEventListener('dragleave', () => {
            list.style.backgroundColor = "";
        });

        list.addEventListener('drop', async (e) => {
            e.preventDefault();
            list.style.backgroundColor = "";
            
            if(draggedItem) {
                const taskId = draggedItem.dataset.id;
                const newStatus = list.id.replace('-list', '');
                
                // 1. 自分が更新中であることを宣言
                isSelfUpdating = true;

                // 2. 見た目を先に変える
                list.appendChild(draggedItem);

                // 3. DBを更新
                const { error } = await supabaseClient
                    .from('tasks')
                    .update({ status: newStatus })
                    .eq('id', taskId);

                if (error) {
                    console.error("更新エラー:", error);
                    alert("更新に失敗しました。再読み込みします。");
                    isSelfUpdating = false;
                    await loadTasks();
                } else {
                    // 4. 通知の衝突を避けるため、少し長めにフラグを維持（1秒）
                    setTimeout(() => {
                        isSelfUpdating = false;
                    }, 1000);
                }
            }
        });
    });

    function addDragEvents(item) {
        item.addEventListener('dragstart', () => {
            draggedItem = item;
            item.style.opacity = "0.5";
        });
        item.addEventListener('dragend', () => {
            item.style.opacity = "1";
            draggedItem = null;
        });
    }
});