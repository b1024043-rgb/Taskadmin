import { SUPABASE_CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', function(){
    // config.js から読み込んだ値を使用
    const supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    // 要素の取得
    const boardScene = document.getElementById('board-scene');
    const formScene = document.getElementById('form-scene');
    const showFormBtn = document.getElementById('show-form-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskManager = document.getElementById('task-manager');

    // ドラッグ中のフラグ
    let isDragging = false;

    // --- 1. データを読み込んで画面に表示する関数 ---
    async function loadTasks() {
        // ドラッグ中は再描画しない（挙動不審を防ぐ）
        if (isDragging) return;

        const { data: tasks, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('データ取得エラー:', error);
            return;
        }

        document.getElementById('todo-list').innerHTML = "";
        document.getElementById('doing-list').innerHTML = "";
        document.getElementById('done-list').innerHTML = "";

        tasks.forEach(task => {
            renderTaskCard(task);
        });
    }

    // --- 2. タスクカードを作成して画面に追加する関数 ---
    function renderTaskCard(task) {
        const listId = `${task.status}-list`;
        const listEl = document.getElementById(listId);
        if (!listEl) return;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
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
        `;

        addDragEvents(card);
        listEl.appendChild(card);
    }

    // --- 3. リアルタイム同期の設定 ---
    supabaseClient
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            loadTasks();
        })
        .subscribe();

    loadTasks();

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

        const { error } = await supabaseClient
            .from('tasks')
            .insert([{ title, manager, due_date, priority, status: 'todo' }]);

        if (error) {
            console.error("保存エラー:", error);
            alert("保存に失敗しました");
        } else {
            taskInput.value = "";
            taskManager.value = ""; 
            taskDate.value = "";
            formScene.style.display = 'none';
            boardScene.style.display = 'flex';
        }
    });

    // --- ドラッグ＆ドロップの安定化ロジック ---
    let draggedItem = null;
    const lists = document.querySelectorAll('.task-list');

    lists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault(); // ドロップを許可
            list.style.backgroundColor = "rgba(0,0,0,0.1)"; // どこに入るか視覚的に補助
        });

        list.addEventListener('dragleave', () => {
            list.style.backgroundColor = ""; // 離れたら色を戻す
        });

        list.addEventListener('drop', async (e) => {
            e.preventDefault();
            list.style.backgroundColor = "";
            
            if(draggedItem) {
                isDragging = true; // DB更新が終わるまでフラグを立てる
                const taskId = draggedItem.dataset.id;
                const newStatus = list.id.replace('-list', '');
                
                // 見た目だけ先に動かす（サクサク感を出す）
                list.appendChild(draggedItem);

                // DBを更新
                const { error } = await supabaseClient
                    .from('tasks')
                    .update({ status: newStatus })
                    .eq('id', taskId);

                if (error) console.error("更新エラー:", error);
                
                isDragging = false; // 更新完了
                loadTasks(); // 最後に整合性を合わせる
            }
        });
    });

    function addDragEvents(item) {
        item.addEventListener('dragstart', () => {
            draggedItem = item;
            isDragging = true; // ドラッグ開始時に再描画を止める
            setTimeout(() => { item.style.opacity = "0.5"; }, 0);
        });
        item.addEventListener('dragend', () => {
            isDragging = false;
            item.style.opacity = "1";
            draggedItem = null;
        });
    }
});