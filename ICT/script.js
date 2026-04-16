import { SUPABASE_CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', function () {
    const supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    console.log("URL:", SUPABASE_CONFIG.URL);
    console.log("Key:", SUPABASE_CONFIG.KEY ? "取得成功" : "取得失敗（空です）");

    //  挙動を安定させるためのフラグ管理
    let isSelfUpdating = false;
    //  ユーザー情報を保持する変数
    let currentUser = null;
    //  マルチセレクト用の状態管理
    let allProfiles = [];
    let selectedAssignees = [];

    // --- ログインチェック ---
    async function checkUser() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }
        currentUser = session.user;
        await fetchProfiles(); // プロフィール一覧を先に取得
        document.getElementById('board-scene').style.display = 'flex';
        loadTasks();
    }
    checkUser();

    // --- プロフィール一覧の取得（担当者名の解決に使用）---
    async function fetchProfiles() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, username');
        if (!error && data) {
            allProfiles = data;
        }
    }

    // --- ログアウト ---
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

    // --- シーン切り替え ---
    function switchToScene(sceneId) {
        document.querySelectorAll('.scene').forEach(s => s.style.display = 'none');
        const target = document.getElementById(sceneId);
        if (target) {
            target.style.display = sceneId === 'board-scene' ? 'flex' : 'block';
        }
    }

    // ボード → フォームへ（+ ボタン）
    const showFormBtn = document.getElementById('show-form-btn');
    if (showFormBtn) {
        showFormBtn.addEventListener('click', () => {
            selectedAssignees = [];
            renderChips();
            switchToScene('form-scene');
        });
    }

    // フォーム → ボードへ（戻るボタン）
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchToScene('board-scene');
        });
    }

    // ==========================================================
    // マルチセレクトUI（担当者検索・チップ表示）
    // ==========================================================
    const searchInput = document.getElementById('user-search-input');
    const dropdown = document.getElementById('user-dropdown');
    const chipsContainer = document.getElementById('selected-chips');

    if (searchInput) {
        // 入力に合わせて候補を絞り込む
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            if (!term) {
                dropdown.style.display = 'none';
                return;
            }
            const filtered = allProfiles.filter(p =>
                p.username.toLowerCase().includes(term) &&
                !selectedAssignees.includes(p.id) // 選択済みは除外
            );
            renderDropdown(filtered);
        });

        // 外側クリックでドロップダウンを閉じる
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    function renderDropdown(users) {
        dropdown.innerHTML = '';
        if (users.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = user.username;
            // mousedown で blur より先に発火させてドロップダウンが消えるのを防ぐ
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectedAssignees.push(user.id);
                renderChips();
                searchInput.value = '';
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    }

    function renderChips() {
        chipsContainer.innerHTML = '';
        selectedAssignees.forEach(id => {
            const user = allProfiles.find(p => p.id === id);
            if (!user) return;
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `${user.username} <span class="remove-btn">×</span>`;
            chip.querySelector('.remove-btn').addEventListener('click', () => {
                selectedAssignees = selectedAssignees.filter(sid => sid !== id);
                renderChips();
            });
            chipsContainer.appendChild(chip);
        });
    }

    // ==========================================================
    // タスク保存
    // ※ index.html の ID に合わせて task-input / task-date を使用
    // ==========================================================
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('task-input').value;
            const due_date = document.getElementById('task-date').value;
            const priorityEl = document.querySelector('input[name="priority"]:checked');
            const priority = priorityEl ? priorityEl.value : 'middle';

            if (!title) {
                alert('タスク名は必須です');
                return;
            }
            if (!currentUser) return;

            isSelfUpdating = true;

            const { error } = await supabaseClient
                .from('tasks')
                .insert([{
                    title,
                    due_date,
                    priority,
                    status: 'todo',
                    user_id: currentUser.id,
                    assignees: selectedAssignees  // UUID配列で保存
                }]);

            if (error) {
                console.error('保存エラー:', error);
                alert('保存に失敗しました');
                isSelfUpdating = false;
            } else {
                taskForm.reset();
                selectedAssignees = [];
                renderChips();
                switchToScene('board-scene');

                setTimeout(() => {
                    isSelfUpdating = false;
                    loadTasks();
                }, 800);
            }
        });
    }

    // ==========================================================
    // タスク読み込み
    // ==========================================================
    async function loadTasks() {
        // 自分が操作した直後のリアルタイム通知による再描画をスキップ
        if (isSelfUpdating) return;
        if (!currentUser) return;

        const { data: tasks, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('データ取得エラー:', error);
            return;
        }

        ['todo', 'doing', 'done'].forEach(status => {
            const el = document.getElementById(`${status}-list`);
            if (el) el.innerHTML = '';
        });

        tasks.forEach(task => renderTaskCard(task));
    }

    // ==========================================================
    // タスクカード描画
    // ==========================================================
    function renderTaskCard(task) {
        const listEl = document.getElementById(`${task.status}-list`);
        if (!listEl) return;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.id = task.id;

        // 権限判定
        const isOwner = task.user_id === currentUser.id;
        const isAssignee = Array.isArray(task.assignees) && task.assignees.includes(currentUser.id);
        const canDrag = isOwner || isAssignee; // ドラッグ（ステータス変更）は担当者もOK
        // 削除は作成者のみ（仕様書 5.2 より）

        card.draggable = canDrag;

        const priorityLabel = task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中';

        // 担当者IDを名前に変換
        const assigneeNames = Array.isArray(task.assignees) && task.assignees.length > 0
            ? task.assignees
                .map(id => allProfiles.find(p => p.id === id)?.username || '不明')
                .join(', ')
            : '未設定';

        card.innerHTML = `
            <div class="task-body">
                <div class="priority-badge ${task.priority}">${priorityLabel}</div>
                <strong>${task.title}</strong><br>
                <small>期限: ${task.due_date || '未設定'}</small><br>
                <small>担当: ${assigneeNames}</small>
            </div>
            <div class="task-actions">
                ${isOwner
                ? `<button class="delete-btn" data-id="${task.id}">削除</button>`
                : '<small style="color:#999; font-size:10px;">閲覧のみ</small>'
            }
            </div>
        `;

        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('このタスクを削除しますか？')) {
                    isSelfUpdating = true;
                    const { error } = await supabaseClient
                        .from('tasks')
                        .delete()
                        .eq('id', task.id);

                    if (error) {
                        alert('削除に失敗しました');
                        isSelfUpdating = false;
                    } else {
                        card.remove();
                        setTimeout(() => { isSelfUpdating = false; }, 1000);
                    }
                }
            });
        }

        addDragEvents(card);
        listEl.appendChild(card);
    }

    // ==========================================================
    // リアルタイム同期
    // ==========================================================
    supabaseClient
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            loadTasks(); // isSelfUpdating フラグで自分の操作は無視される
        })
        .subscribe();

    // ==========================================================
    // ドラッグ＆ドロップ
    // ==========================================================
    let draggedItem = null;

    document.querySelectorAll('.task-list').forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.style.backgroundColor = 'rgba(0,0,0,0.1)';
        });
        list.addEventListener('dragleave', () => {
            list.style.backgroundColor = '';
        });
        list.addEventListener('drop', async (e) => {
            e.preventDefault();
            list.style.backgroundColor = '';
            if (!draggedItem) return;

            const taskId = draggedItem.dataset.id;
            const newStatus = list.id.replace('-list', '');

            isSelfUpdating = true;
            list.appendChild(draggedItem); // 先に見た目を変える

            const { error } = await supabaseClient
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', taskId);

            if (error) {
                console.error('更新エラー:', error);
                alert('更新に失敗しました。再読み込みします。');
                isSelfUpdating = false;
                await loadTasks();
            } else {
                setTimeout(() => { isSelfUpdating = false; }, 1000);
            }
        });
    });

    function addDragEvents(item) {
        item.addEventListener('dragstart', () => {
            draggedItem = item;
            item.style.opacity = '0.5';
        });
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
            draggedItem = null;
        });
    }
});