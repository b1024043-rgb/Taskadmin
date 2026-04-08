//DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', function(){
    //console.logでデバッグメッセージを出力
    console.log('ページが読み込まれました！');

    //HTML要素を取得
    const greetBtn = document.getElementById('greetBtn');
    const changeColorBtn = document.getElementById('changeColorBtn');
    const resultElement = document.getElementById('result');
    const messageElement = document.getElementById('message');

    //要素が取得できたかコンソールで確認
    console.log('挨拶ボタン',greetBtn);
    console.log('色変更ボタン',changeColorBtn);
    console.log('結果表示領域',resultElement);

    //挨拶ボタンのクリックイベント
    greetBtn.addEventListener('click',function(){
        console.log('挨拶ボタンがクリックされました。');
        
        //現在の時間を取得
        const currentHour =new Date().getHours();
        let greeting;

        //時間帯に応じて挨拶を変える
        if (currentHour <12){
            greeting = 'おはようございます！';
        }else if(currentHour < 18){
            greeting = 'こんにちは！';
        }else {
            greeting = 'こんばんは！';
        }
        //デバッグ情報をコンソールに出力
        console.log('現在の時間:',currentHour, '時');
        console.log('選択された挨拶', greeting);

        //結果を表示
        resultElement.innerHTML = '時間: ' + currentHour + '時<br>' + '<span class="highlight">' + greeting + '</span';
    });

    //色変更ボタンのクリックイベント
    changeColorBtn.addEventListener('click', function(){
        console.log('色変更ボタンがクリックされました。');

        //ランダムな色を生成
        const colors = ['#FF6B6B', '#4ECDC4','#45B7D1', '#FFBE0B', '#7B68EE'];
        const randomIndex = Math.floor(Math.random() * colors.length);
        const selectedColor = colors[randomIndex];

        //デバッグ情報をコンソールに出力
        console.log('利用可能な色:',colors);
        console.log('選択されたインデックス:', randomIndex);
        console.log('選択された色:', selectedColor);

        //メッセージの色を変更
        messageElement.style.color = selectedColor;

        //結果を表示
        resultElement.innerHTML = '色を変更しました:<br>' + '選択された色 <span style= "color:' + selectedColor + '">' + selectedColor + '</span>';
    });

});