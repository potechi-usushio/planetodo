'use strict';

let workMin; //ユーザーが選択した作業時間
let breakMin; //ユーザーが選択した休憩時間
let totalMin; //workMin + breakMin をのちに格納
let currentTask; // 現在ラジオボタンで選択中のタスクを格納, getNowTask();で更新
let radioFlag = false; //　ONになっているラジオボタンが存在するとtrue

const cx = 200; //円の中心のx座標
const cy = 200; //円の中心のy座標
const outerR = 140; //外円の半径
const innerR = 120;　//内円の半径


function load() {
    // KeepListをリロード
    reloadKeepList();

    // startボタンは初期状態は無効に
    document.getElementById("clockstart-btn").disabled = true;

    //作業時間をフォームから取得
    document.getElementById('work').select.onchange = () => {
        workMin = parseInt(document.getElementById('work').select.value);
        workMin = workMin / 60;

        if (workMin && breakMin) {
            totalMin = workMin + breakMin;
            getNowTask();
            drawDial();
            drawEarth();
            if (radioFlag) {
                document.getElementById("clockstart-btn").disabled = false;
            }
        }
    }

    //休憩時間をフォームから取得
    document.getElementById('break').select.onchange = () => {
        breakMin = parseInt(document.getElementById('break').select.value);
        breakMin = breakMin / 60;

        if (workMin && breakMin) {
            totalMin = workMin + breakMin;
            getNowTask();
            drawDial();
            drawEarth();
            if (radioFlag) {
                document.getElementById("clockstart-btn").disabled = false;
            }
        }
    }
}

//作業時間・休憩時間を表す円盤を描画
function drawDial() {
    let dialCanvas = document.getElementById("dial-canvas");
    if (dialCanvas.getContext && workMin && breakMin) {
        let ctx = dialCanvas.getContext("2d");
        //canvasをクリア
        ctx.clearRect(0, 0, 300, 300);

        //2πを作業・休憩時間の比で分配
        let startAngle = - Math.PI / 2;
        let endAngle = 2 * Math.PI * workMin / (workMin + breakMin) - Math.PI / 2;

        //作業時間の扇形を描画
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, endAngle, false);
        ctx.lineTo(cx, cy);
        ctx.fillStyle = "rgb(149, 54, 249)";
        ctx.fill();

        //休憩時間の扇形を描画
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, endAngle, startAngle, false);
        ctx.lineTo(cx, cy);
        ctx.fillStyle = "rgb(119, 216, 198)";
        ctx.fill();

        //内円とその内容を描画
        createInnerCircle();
    }
}

function createInnerCircle() {
    let dialCanvas = document.getElementById("dial-canvas");
    if (dialCanvas.getContext) {
        let dctx = dialCanvas.getContext("2d");
        //中央にタスクなどを表示する領域(内円)を描画
        dctx.beginPath();
        dctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
        dctx.fillStyle = "rgb(20, 11, 69)";
        dctx.fill();

        showTask();
        createSun();
    }
}

// 選択中のタスクを内円内に表示
function showTask() {
    let dialCanvas = document.getElementById("dial-canvas");
    let dctx = dialCanvas.getContext("2d");
    let taskName = currentTask;
    let lenOfTask = taskName.length;

    //タスクの文字数を4文字まで、10文字まででクリップ
    let clipMin = 4;
    let clipMax = 10;
    let clippedLen = lenOfTask;
    clippedLen = Math.max(clipMin, clippedLen);
    clippedLen = Math.min(clipMax, clippedLen);

    // y = -2 x + 38 (4文字までは30px固定, 5~9文字は可変(28 ~ 20px)、10文字以降は18px固定)
    let fontsize = - 2 * clippedLen + 38; 
    let upPx = (innerR - fontsize) / 2.5;

    dctx.fillStyle = "rgb(255, 255, 255)";
    dctx.font = `${fontsize}px serif`;
    //　表示文字数の調整
    if (lenOfTask < clipMax) { // 9字までは全て表示
        let textWidth = dctx.measureText(taskName).width;
        dctx.fillText(taskName, cx - textWidth / 2, cy - upPx);
    } else { // 10文字以降は9文字で切って省略して表示
        taskName = taskName.substr(0, clipMax - 1) + "…";
        let textWidth = dctx.measureText(taskName).width;
        dctx.fillText(taskName, cx - textWidth / 2, cy - upPx);
    }
}

// Timer中央部・黄色の小円を描画
function createSun() {

    let dialCanvas = document.getElementById("dial-canvas");
    if (dialCanvas.getContext) {
        let ctx = dialCanvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(255, 210, 127)";
        ctx.fill();
    }

}

let counter = ""; // タイマーが現在何周めかを表す変数
let doneCounter = 0; // タイマーが何周し終わったかを表す変数

// 黄色の小円内にcounter数を表示
function sunCounter() {
    let dialCanvas = document.getElementById("dial-canvas");
    if (dialCanvas.getContext) {
        let ctx = dialCanvas.getContext("2d");
        ctx.fillStyle = "rgb(20, 11, 69)";
        ctx.font = "30px serif";
        let textWidth = ctx.measureText(counter).width;
        let textLen = `${counter}`.length;

        ctx.fillText(counter, cx - textWidth / 2, cy + 12);
    }
}



/* ------ タイマー機能 ------------ */

let clockStartAngle = - 0.5 * Math.PI;
let clockEndAngle = - 0.5 * Math.PI;
const msecPerRepeat = 100; // mSecミリ秒ごとにdrawClock()を行う
let earthOrbitalR = outerR + 20; // タイマーの円弧(白く細い周回軌道, 経過時間を表す)の半径
let earthR = 6; // タイマー円弧先の白丸の半径, 現在時点を表す
let ex; // 白丸x座標
let ey; // 白丸y座標

let anglePerMin;
let incrementAngle;

document.getElementById("done-counter-area").textContent = "0";


// 処理をくり返すごとにタイマーの円弧を描き足していく
function drawClock() {
    totalMin = workMin + breakMin;
    anglePerMin = 2 * Math.PI / totalMin; //totalMinを2PIとした時の1minあたりの角度
    incrementAngle = anglePerMin * msecPerRepeat / (60 * 1000); //mSecPerRepeatあたりの角度
    clockEndAngle = clockStartAngle + incrementAngle;

    drawEarth();

    let clockCanvas = document.getElementById("clock-canvas");
    if (clockCanvas.getContext) {
        let cctx = clockCanvas.getContext("2d");
        cctx.beginPath();
        cctx.strokeStyle = "rgb(255,255,255)";
        cctx.arc(cx, cy, earthOrbitalR, clockStartAngle, clockEndAngle);
        cctx.stroke();
        clockStartAngle = clockStartAngle + incrementAngle;
        clockEndAngle = clockEndAngle + incrementAngle;
    }
}

// タイマーの円弧の先に白い小円を描画
function drawEarth() {

    let earthCanvas = document.getElementById("earth-canvas");
    if (earthCanvas.getContext) {
        let ectx = earthCanvas.getContext("2d");
        ex = cx + earthOrbitalR * Math.sin(clockEndAngle + 0.5 * Math.PI);
        ey = cy - earthOrbitalR * Math.cos(clockEndAngle + 0.5 * Math.PI);

        ectx.clearRect(0, 0, 400, 400);
        ectx.fillStyle = "rgb(255, 255, 255)";
        ectx.beginPath();
        ectx.arc(ex, ey, earthR, 0, 2 * Math.PI);
        ectx.fill();
    }
}


let status = "";
let workTotal = 0; //合計作業時間
let border = 0; //作業・休憩時間の境界線のラジアン
let intervalID;
let soundFlag = false;

let startAudio = new Audio();
let borderAudio = new Audio();
let endAudio = new Audio();
startAudio = document.querySelector("#start-audio");
borderAudio = document.querySelector("#border-audio");
endAudio = document.querySelector("#end-audio");

function getStatus() {

    if (clockEndAngle < border) {
        status = "WORK";
        document.getElementById("currentStatus-area").innerText = status;
    } else if (border <= clockEndAngle && clockEndAngle < 1.5 * Math.PI) {
        status = "BREAK";
        document.getElementById("currentStatus-area").innerText = status;
    } else if (1.5 * Math.PI <= clockEndAngle) {
        status = "FINISHED";
        document.getElementById("currentStatus-area").innerText = status;
    }
}

function soundEffect() {
    if (border <= clockEndAngle && clockEndAngle < 1.5 * Math.PI) {
        if (!soundFlag) {
            borderAudio.play();
            soundFlag = true;
        }
    } else if (1.5 * Math.PI <= clockEndAngle) {
        endAudio.play();
    }
}

//1周するまでdrawClock()をくり返す
function repeat() {

    getStatus();
    soundEffect();

    if (clockEndAngle < 1.5 * Math.PI) {
        drawClock();
    } else if (1.5 * Math.PI <= clockEndAngle) {　
        // タイマーが1周し終わった時の処理

        drawClock();
        clearInterval(intervalID);
        document.getElementById("clockstart-btn").value = " start ";
        getNowTask();
        createInnerCircle();
        sunCounter();

        counter += 1;
        doneCounter += 1;
        document.getElementById("done-counter-area").textContent = doneCounter;

        workTotal = workTotal + workMin;
        let roundTotal =  Math.round(workTotal);
        document.getElementById("total-work-area").textContent = roundTotal;

        clockStartAngle = - 0.5 * Math.PI;
        clockEndAngle = - 0.5 * Math.PI;

        // 全てのラジオボタンを有効化
        let radioBtns = document.querySelectorAll("#todoForm input[type='radio']");
        radioBtns.forEach(element => {
            element.disabled = false;
        });

        // 全てのdoneボタンを有効化
        let doneBtns = document.querySelectorAll("#todoForm input[value='done']");
        doneBtns.forEach(element => {
            element.disabled = false;
        });

        //　時間設定ボタンを有効化
        let workMinBtn = document.getElementById("work").select;
        workMinBtn.disabled = false;
        let breakMinBtn = document.getElementById("break").select;
        breakMinBtn.disabled = false;
    }
}


//タイマーのスタート/リスタート
//領域をクリアし、mmSecごとにrepeat()をくり返す
function clockStartBtn() {
    startAudio.play();
    clockRefresh();
    if (workMin && breakMin) {
        if (counter === "") {
            counter = 1;
            doneCounter = counter - 1;
        }

        border = 2 * Math.PI * workMin / totalMin - 0.5 * Math.PI;　//12時の方向が-0.5 * Math.PIで表される 
        createSun();
        sunCounter();
        document.getElementById("counter-area").textContent = counter;
        document.getElementById("done-counter-area").textContent = doneCounter;
        document.getElementById("clockstart-btn").value = "restart";

        intervalID = setInterval(repeat, msecPerRepeat);

        //　ラジオボタンを無効化
        let radioBtns = document.querySelectorAll("#todoForm input[type='radio']");
        radioBtns.forEach(element => {
            element.disabled = true;
        });

        //　時間設定ボタンを無効化
        let workMinBtn = document.getElementById("work").select;
        workMinBtn.disabled = true;
        let breakMinBtn = document.getElementById("break").select;
        breakMinBtn.disabled = true;
    }
}

function clockResetBtn() {
    clockRefresh();
    //ラジオボタン有効化
    let radioBtns = document.querySelectorAll("#todoForm input[type='radio']");
    radioBtns.forEach(element => {
        element.disabled = false;
    });
}

function clockRefresh() {
    clearInterval(intervalID);
    clockStartAngle = - 0.5 * Math.PI;
    clockEndAngle = - 0.5 * Math.PI;
    soundFlag = false;

    let clockCanvas = document.getElementById("clock-canvas");
    if (clockCanvas.getContext) {
        let ctx = clockCanvas.getContext("2d");
        ctx.clearRect(0, 0, 400, 400);
    }
    let earthCanvas = document.getElementById("earth-canvas");
    if (earthCanvas.getContext) {
        let ectx = earthCanvas.getContext("2d");
        ectx.clearRect(0, 0, 400, 400);
        drawEarth();
    }
    document.getElementById("clockstart-btn").value = " start ";
    status = "";
    document.getElementById("currentStatus-area").innerText = status;
}



/*--------- タスク管理機能 --------------------------*/

let keyNum = 0; // localStorageに(key, value)の形で値を保存する時のkey。(タスクID,タスク名)のようなもの。

/* 
(addボタンを押すと)
・フォームに入力されたタスク名をローカルストレージのkeNum番目に保存する
・リストにタスクアイテム(ボタン類とタスク名のセット)を表示
・currentTask名を含む内円を表示
*/
function SaveKeyValue() {

    const key = keyNum;
    const value = document.forms.taskForm.taskInput.value;
    if (value !== "") {
        keyNum += 1;
        window.localStorage.setItem(key, value);
        document.getElementById('taskForm').reset();
        
        CreateTaskItem(key, value);
        getNowTask();
        createInnerCircle();
        drawEarth();
    }

}

//テキストボックス上でEnterキーを押下時、addボタンを押下と同じ動作をする
const taskInput = document.getElementById("taskInput");
taskInput.onkeydown = event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        SaveKeyValue();
    }
};

/** 
 * TodoListにタスクアイテムを追加する
 * @param {string} key 追加したいタスクを値にとるlocalStorageのキー
 * タスクアイテム： タスク名、ボタン類をまとめた1行の単位。#Num${key}のついた<tr>
 */
function CreateTaskItem(key) {

    //　親となる<tr>
    let value = localStorage.getItem(key);
    let tr = document.createElement("tr");
    tr.id = `Num${key}`;
    //　子となる<td>
    //　タスク名
    let taskName = document.createElement("td");
    taskName.textContent = `${value}`;
    //　ラジオボタン
    let radioTd = document.createElement("td");
    radioTd.id = `radio-td${key}`;
    let radioInput = document.createElement("input");
    radioInput.name = "nowTask";
    radioInput.type = "radio";
    radioInput.value = window.localStorage.getItem(key);
    radioInput.id = `radio-btn${key}`;
    radioTd.appendChild(radioInput);
    //　deleteボタン
    let deleteTd = document.createElement("td");
    deleteTd.id = `delete-td${key}`;
    let deleteInput = document.createElement("input");
    deleteInput.id = `delete-btn${key}`;
    deleteInput.type = "button";
    deleteInput.value = "delete";
    deleteTd.appendChild(deleteInput);
    //　doneボタン
    let doneTd = document.createElement("td");
    doneTd.id = `done-td${key}`;
    const doneInput = document.createElement("input");
    doneInput.id = `done-btn${key}`;
    doneInput.type = "button";
    doneInput.value = "done";
    doneTd.appendChild(doneInput);
    //　keepボタン
    let keepTd = document.createElement("td");
    keepTd.id = `keep-td${key}`;
    const keepInput = document.createElement("input");
    keepInput.id = `keepBtn${key}`;
    keepInput.type = "button";
    keepInput.value = "keep";
    keepTd.appendChild(keepInput);
    //ラジオボタン・タスク名・doneボタン・keepボタン・deleteボタンの順で子要素に追加
    tr.appendChild(radioTd);
    tr.appendChild(taskName);
    
    tr.appendChild(doneTd);
    tr.appendChild(keepTd);
    tr.appendChild(deleteTd);
    document.getElementById("todo-list").appendChild(tr);

    //　ボタンのイベント設定
    //　ラジオボタンのイベント
    document.getElementById(`radio-btn${key}`).onclick = () => {
        getNowTask();
        if (workMin && breakMin) {
            drawDial();
            // startボタンを有効化
            document.getElementById("clockstart-btn").disabled = false;
        } else {
            createInnerCircle();
        }
    };

    //　deleteボタンのイベント
    document.getElementById(`delete-btn${key}`).onclick = () => {   
        getNowTask();
        //タイマー作動中でなければinnerCircleを再描画
        if (clockEndAngle == - 0.5 * Math.PI) {  
            createInnerCircle();
        }

        // DoneList内のタスクアイテムの削除ボタン押下の場合、ツイート内容再取得・ツイートボタン再作成
        // DoneList内にタスクアイテムがなくなる場合はツイートボタンを削除
        let element = document.querySelector(`#Num${key}`);
        let doneElement = document.querySelectorAll(`.doneTask`);
        let tweetBtn = document.querySelector(".twitter-hashtag-button");

        if (element.className == "doneTask") { // DoneListのタスクアイテムのdeleteボタンを押した
            if (doneElement.length == 1) { // DoneListに1つしかタスクアイテムがない
                tweetBtn.remove();
                RemoveKeyValue(key);
                getNowTask();  
            } else { // 2つ以上ある
                tweetBtn.remove();
                RemoveKeyValue(key);
                createTweetBtn(); 
                getNowTask();  
            }
        } else { // TodoListのタスクアイテムのdeleteボタンを押した
            RemoveKeyValue(key);
            getNowTask(); 
            createInnerCircle();
        }
    };

    // doneボタンのイベント
    document.getElementById(`done-btn${key}`).onclick = () => {
        MoveTask(key);
        getNowTask();
        if (clockEndAngle == - 0.5 * Math.PI) {
            createInnerCircle();
        }
        radioFlagJudge();
        if(!radioFlag){
            document.getElementById(`clockstart-btn`).disabled = true;
        }
        
    };

    // keepボタンのイベント
    document.querySelector(`#keepBtn${key}`).onclick = () => {
        keepTask(key);
        getNowTask();
        if (clockEndAngle == - 0.5 * Math.PI) {
            createInnerCircle();
        }
        document.querySelector(`#keepBtn${key}`).disabled = true;
    };

    // 1周も終わってない場合はdoneボタンを無効
    if (doneCounter == 0) {
        document.getElementById(`done-btn${key}`).disabled = true;
    }
    // タイマー中に追加した場合はラジオボタンを無効
    if (clockEndAngle != - 0.5 * Math.PI) {
        document.getElementById(`radio-btn${key}`).disabled = true;
        sunCounter();
    }
}

/**
 * key番号を渡すと該当のvalueをlocalStorageから削除したのち、画面上のTodo List, Done List からタスクアイテムごと削除
 * @param {string} key 消したいタスク名を値にとるlocalStorageのキー
 */
function RemoveKeyValue(key) {
    let value = window.localStorage.getItem(key);
    window.localStorage.removeItem(key);
    document.getElementById(`Num${key}`).remove();
}

/**　Todo ListのタスクアイテムをDone Listに移動させる
 * @param {string} key 動かしたいタスク名を値にとるlocalStorageのキー
  */
function MoveTask(key) {
    //todoListの子要素だったtaskを除き、doneListの子要素に加える
    let todo = document.getElementById("todo-list");
    let done = document.getElementById("done-list");
    let taskItem = document.querySelector(`#Num${key}`);
    todo.removeChild(taskItem);
    done.appendChild(taskItem);
    //済ボタンを含む<td>を削除する
    document.querySelector(`#done-td${key}`).remove();
    //ラジオボタンを含む<td>を削除する
    document.querySelector(`#radio-td${key}`).remove();
    //doneTaskクラスを付与(のちに一覧で取得するため)
    let element = document.querySelector(`#Num${key}`);
    element.classList.add('doneTask');
    createTweetBtn();
}

// TodoListからKeepListにタスクアイテムをコピーする
function keepTask(key) {
    let taskName = window.localStorage.getItem(key);
    let keepList = document.querySelector(`#keep-list`);

    let tr = document.createElement("tr");
    tr.id = `keepNum${key}`;
    tr.className = "keepTask";

    let taskTd = document.createElement("td");
    taskTd.textContent = taskName;

    //　keepからTodoに追加するTodoボタン
    let todoTd = document.createElement("td");
    let todoInput = document.createElement("input");
    todoInput.value = "todo";
    todoInput.type = "button";
    todoInput.id = `todo-btn${key}`;
    todoTd.appendChild(todoInput);

    //　keepから削除するdeleteボタン
    let deleteTd = document.createElement("td");
    let deleteInput = document.createElement("input");
    deleteInput.value = "delete";
    deleteInput.type = "button";
    deleteInput.id = `keep-delete-btn${key}`;
    deleteTd.appendChild(deleteInput);

    tr.appendChild(taskTd);
    tr.appendChild(todoTd);
    tr.appendChild(deleteTd)
    keepList.appendChild(tr);

    //　todoボタンのイベント
    //　saveKeyValue();とほぼ同様。keyに代入するkeyNumを共有しているため、フォームからでもkeepからでも追加した順にkey番号が割り当てられる
    document.querySelector(`#todo-btn${key}`).onclick = () => {
        let value = taskName;
        if (value != "") {
            keyNum += 1;
            window.localStorage.setItem(key, value);
            CreateTaskItem(key, value);
            getNowTask();
            createInnerCircle();
            drawEarth();
        }
    };

    // deleteボタンのイベント (keeplist内でのみ削除)
    document.querySelector(`#keep-delete-btn${key}`).onclick = () => {
        document.querySelector(`#keepNum${key}`).remove();
    };
    // keepList内の要素を再取得して配列内容を更新
    saveKeepList();    
}

// keepList内のタスク(.keepTaskのついたtr要素)をallKeepTask配列に格納
function saveKeepList () {
    let allKeepTask = [];
    let keepElement = [];
    keepElement = document.querySelectorAll(".keepTask");
    keepElement.forEach(element => {
        allKeepTask.push(element.textContent);
    });
    // localstorageに保存
    localStorage.setItem("keepList", JSON.stringify(allKeepTask));
}

// localStorageに保存したKeepListのリロード
function reloadKeepList() {
    if (localStorage.getItem('keepList')){
        let keepedTaskList = JSON.parse(localStorage.getItem('keepList'));
        
        keepedTaskList.forEach(element => {
            let key = keyNum;
            keyNum += 1;

            window.localStorage.setItem(key, element);
            document.getElementById('taskForm').reset();
            keepTask(key);
            getNowTask();
        });
    }
}

function clearKeepList() {
    // localStorage内に保存した値を削除
    localStorage.removeItem('keepList');
    
    // keep-list-areaを削除
    let keepElement = document.querySelectorAll(".keepTask");
    keepElement.forEach(element => {
        element.remove();
    });
    
}

// 選択中のタスクの有無を判定, booleanでradioFlagに格納
function radioFlagJudge() {
    radioFlag = false;
    let radio = document.getElementById("todoForm").nowTask; //radioボタンのinput要素を取得
    let radioNodes = document.querySelectorAll("#todoForm input[type='radio']");//NodeList形式で返ってくる
    if (radio) { //ラジオボタンが存在する
        //ONになっているラジオボタンがあるか判定する
        for (let i = 0; i < radioNodes.length; i++) {
            let check = radioNodes[i].checked;
            radioFlag = radioFlag || check;
        }
    }
}

// ラジオボタンがonになっている(現在タスク)タスクアイテムのタスク名、または時間・タスクの選択状況によって必要な指示内容を返す
function getNowTask() {
    let radio = document.getElementById("todoForm").nowTask; //radioボタンのinput要素を取得
    radioFlagJudge();
    if (radio) { //ラジオボタンが存在する
        //ONになっているラジオボタンがあるか判定する
        if (radioFlag) { //かつONの値がある
            if (workMin && breakMin) { //時間を選択している
                currentTask = radio.value;
            } else { //時間を選択していない
                currentTask = "時間を選択";
            }
        } else if (!radioFlag) {　//ONの値がない
            if (workMin && breakMin) { //時間を選択している
                currentTask = "タスクを選択";
            } else { //時間を選択していない
                currentTask = "タスクと時間を選択";
            }
        }
    } else if (!radio) { //ラジオボタンが存在しない
        currentTask = "タスクを追加";
    }
}

//　DoneList内のタスク名を配列で取得
let allDoneTask = [];
function getDoneList() {
    allDoneTask = [];
    let doneTaskName = [];
    let doneElement = [];
    doneElement = document.querySelectorAll(".doneTask");
    doneElement.forEach(element => {
        doneTaskName.push(element.textContent);
    });
    allDoneTask = doneTaskName;
}

//　取得したDoneListのタスク内容をツイートする文に加工
function getTweetContent() {
    getDoneList();
    let tweet = "";
    for (const task of allDoneTask) {
        tweet = tweet + `${task}\n`;
    }
    let roundTotal =  Math.round(workTotal);
    tweet = tweet + `のタスクを終えました！\n Total worked min : ${roundTotal} min\n Orbit : ${doneCounter} time(s)\n`;
    return tweet;
}

/**
 *指定した要素の子要素を全て除去する
 * @param {HTMLElement} element 親となるHTMLの要素
*/
function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

//　ツイートボタンを作成
function createTweetBtn() {
    if (1 <= doneCounter && workMin && breakMin) {
        let tweet = getTweetContent();

        const tweetDivided = document.getElementById("tweet-area");
        removeAllChildren(tweetDivided);

        const anchor = document.createElement("a");
        const hrefValue = "https://twitter.com/intent/tweet?button_hashtag=planetodo&ref_src=twsrc%5Etfw";

        anchor.setAttribute("href", hrefValue);
        anchor.setAttribute("class", "twitter-hashtag-button");
        anchor.setAttribute("data-text", tweet);
        anchor.innerText = "Tweet #planetodo";

        tweetDivided.appendChild(anchor);

        const script = document.createElement("script");
        script.setAttribute("src", "https://platform.twitter.com/widgets.js");
        script.setAttribute("charset", "utf-8");
        tweetDivided.appendChild(script);
    }
}


