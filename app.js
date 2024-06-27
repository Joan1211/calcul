// Initialize IndexedDB
let db;
const dbName = 'MentalMathTrainerDB';
const dbVersion = 1;

const request = indexedDB.open(dbName, dbVersion);

request.onerror = event => console.error('IndexedDB error:', event.target.error);
request.onsuccess = event => {
    db = event.target.result;
    console.log('IndexedDB opened successfully');
    displayDailyStats(); // Display stats when DB is ready
};

request.onupgradeneeded = event => {
    db = event.target.result;
    const objectStore = db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('date', 'date', { unique: false });
    objectStore.createIndex('level', 'level', { unique: false });
};

// App state
let currentLevel = 0;
let currentExercise = 0;
let exercises = [];
let results = [];
let startTime;
let timerInterval;
let charts = {};
let questionCount = 20; // Default to 20 questions
let operandCount = 2; // Default to 2 operands

// DOM elements
const homeScreen = document.getElementById('home-screen');
const exerciseScreen = document.getElementById('exercise-screen');
const resultScreen = document.getElementById('result-screen');
const exerciseDisplay = document.getElementById('exercise-display');
const answerInput = document.getElementById('answer-input');
const submitButton = document.getElementById('submit-answer');
const exitButton = document.getElementById('exit-exercise');
const feedbackElement = document.getElementById('feedback');
const resultSummary = document.getElementById('result-summary');
const backToHomeButton = document.getElementById('back-to-home');
const statsContent = document.getElementById('stats-content');
const questionCounter = document.getElementById('question-counter');
const timerDisplay = document.getElementById('timer-display');
const questionCountButtons = document.querySelectorAll('.question-count-btn');
const operandCountButtons = document.querySelectorAll('.operand-count-btn');

// Event listeners
document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => startLevel(parseInt(btn.dataset.level)));
});

submitButton.addEventListener('click', handleSubmitOrNext);
exitButton.addEventListener('click', exitExercise);
backToHomeButton.addEventListener('click', showHomeScreen);

questionCountButtons.forEach(btn => {
    btn.addEventListener('click', () => setQuestionCount(parseInt(btn.dataset.count)));
});

operandCountButtons.forEach(btn => {
    btn.addEventListener('click', () => setOperandCount(parseInt(btn.dataset.count)));
});

// Add event listener for Enter key
answerInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        handleSubmitOrNext();
    }
});

// Functions
function setQuestionCount(count) {
    questionCount = count;
    questionCountButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
    });
}

function setOperandCount(count) {
    operandCount = count;
    operandCountButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
    });
}

function startLevel(level) {
    currentLevel = level;
    currentExercise = 0;
    exercises = generateExercises(level);
    results = [];
    showExerciseScreen();
    displayNextExercise();
}

function generateExercises(level) {
    const exercises = [];
    for (let i = 0; i < questionCount; i++) {
        exercises.push(generateExercise(level));
    }
    return exercises;
}

function generateExercise(level) {
    const numbers = [];
    const operations = [];
    let expression = '';
    let answer = 0;

    for (let i = 0; i < operandCount; i++) {
        let num;
        switch (level) {
            case 1:
                num = Math.floor(Math.random() * 9) + 1; // 1 to 9
                break;
            case 2:
                num = Math.floor(Math.random() * 90) + 10; // 10 to 99
                break;
            case 3:
                num = Math.floor(Math.random() * 900) + 100; // 100 to 999
                break;
        }
        numbers.push(num);

        if (i > 0) {
            const op = Math.random() < 0.5 ? '+' : '-';
            operations.push(op);
        }
    }

    expression = numbers.reduce((acc, num, index) => 
        index === 0 ? num : `${acc} ${operations[index - 1]} ${num}`, '');
    
    answer = eval(expression);

    return { expression, answer };
}

function showExerciseScreen() {
    homeScreen.style.display = 'none';
    exerciseScreen.style.display = 'block';
    resultScreen.style.display = 'none';
    answerInput.focus(); // Set focus to the input field
}

function displayNextExercise() {
    if (currentExercise < exercises.length) {
        exerciseDisplay.textContent = exercises[currentExercise].expression;
        answerInput.value = '';
        feedbackElement.textContent = '';
        submitButton.textContent = 'Submit';
        answerInput.disabled = false;
        updateQuestionCounter();
        startTimer();
        answerInput.focus(); // Set focus to the input field
    } else {
        showResultScreen();
    }
}

function updateQuestionCounter() {
    questionCounter.textContent = `Question ${currentExercise + 1}/${questionCount}`;
}

function startTimer() {
    startTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Call immediately to show 0s
}

function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function handleSubmitOrNext() {
    if (submitButton.textContent === 'Submit') {
        checkAnswer();
    } else {
        moveToNextQuestion();
    }
}

function checkAnswer() {
    const userAnswer = parseInt(answerInput.value);
    const correctAnswer = exercises[currentExercise].answer;
    const isCorrect = userAnswer === correctAnswer;
    const timeTaken = stopTimer();

    results.push({
        exercise: exercises[currentExercise].expression,
        userAnswer,
        correctAnswer,
        isCorrect,
        timeTaken
    });

    if (isCorrect) {
        currentExercise++;
        if (currentExercise < exercises.length) {
            displayNextExercise();
        } else {
            showResultScreen();
        }
    } else {
        feedbackElement.textContent = `Incorrect. The correct answer is ${correctAnswer}.`;
        submitButton.textContent = 'Next';
        answerInput.disabled = true;
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    return Math.floor((Date.now() - startTime) / 1000);
}

function moveToNextQuestion() {
    currentExercise++;
    if (currentExercise < exercises.length) {
        displayNextExercise();
    } else {
        showResultScreen();
    }
}

function showResultScreen() {
    exerciseScreen.style.display = 'none';
    resultScreen.style.display = 'block';

    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = (correctCount / results.length) * 100;
    const totalTime = results.reduce((sum, r) => sum + r.timeTaken, 0);
    const averageTime = totalTime / results.length;

    resultSummary.innerHTML = `
        <p>Level: ${currentLevel}</p>
        <p>Correct Answers: ${correctCount} out of ${questionCount}</p>
        <p>Accuracy: ${accuracy.toFixed(2)}%</p>
        <p>Total Time: ${totalTime} seconds</p>
        <p>Average Time per Question: ${averageTime.toFixed(2)} seconds</p>
    `;

    saveResults();
}

function saveResults() {
    const transaction = db.transaction(['results'], 'readwrite');
    const objectStore = transaction.objectStore('results');

    const result = {
        date: new Date(),
        level: currentLevel,
        questionCount: questionCount,
        operandCount: operandCount,
        exercises: results
    };

    const request = objectStore.add(result);
    request.onerror = event => console.error('Error saving results:', event.target.error);
    request.onsuccess = event => {
        console.log('Results saved successfully');
        displayDailyStats(); // Update stats after saving new results
    }
}

function showHomeScreen() {
    homeScreen.style.display = 'block';
    exerciseScreen.style.display = 'none';
    resultScreen.style.display = 'none';
    displayDailyStats(); // Refresh stats when returning to home screen
}

function exitExercise() {
    stopTimer();
    currentExercise = 0;
    exercises = [];
    results = [];
    showHomeScreen();
}

function displayDailyStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transaction = db.transaction(['results'], 'readonly');
    const objectStore = transaction.objectStore('results');
    const dateIndex = objectStore.index('date');

    const range = IDBKeyRange.lowerBound(today);
    const request = dateIndex.openCursor(range);

    let totalExercises = 0;
    let correctAnswers = 0;
    let totalTime = 0;
    let exercisesByLevel = {1: 0, 2: 0, 3: 0};

    request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const result = cursor.value;
            totalExercises += result.questionCount;
            correctAnswers += result.exercises.filter(e => e.isCorrect).length;
            totalTime += result.exercises.reduce((sum, e) => sum + e.timeTaken, 0);
            exercisesByLevel[result.level] += result.questionCount;
            cursor.continue();
        } else {
            // All results processed, update the stats display
            const accuracy = totalExercises > 0 ? (correctAnswers / totalExercises * 100).toFixed(2) : 0;
            const averageTime = totalExercises > 0 ? (totalTime / totalExercises).toFixed(2) : 0;
            statsContent.innerHTML = `
                <p>Total Exercises: ${totalExercises}</p>
                <p>Correct Answers: ${correctAnswers}</p>
                <p>Accuracy: ${accuracy}%</p>
                <p>Average Time per Question: ${averageTime} seconds</p>
                <p>Level 1: ${exercisesByLevel[1]} | Level 2: ${exercisesByLevel[2]} | Level 3: ${exercisesByLevel[3]}</p>
            `;

            // After displaying daily stats, fetch and display historical data
            fetchHistoricalData();
        }
    };

    request.onerror = event => {
        console.error('Error fetching daily stats:', event.target.error);
        statsContent.innerHTML = '<p>Unable to load today\'s stats.</p>';
    };
}

function fetchHistoricalData() {
    const transaction = db.transaction(['results'], 'readonly');
    const objectStore = transaction.objectStore('results');
    const request = objectStore.getAll();

    request.onsuccess = event => {
        const results = event.target.result;
        const historicalData = {1: [], 2: [], 3: []};

        results.forEach(result => {
            const averageTime = result.exercises.reduce((sum, e) => sum + e.timeTaken, 0) / result.exercises.length;
            historicalData[result.level].push({
                date: new Date(result.date),
                averageTime: averageTime
            });
        });

        for (let level = 1; level <= 3; level++) {
            createOrUpdateChart(level, historicalData[level]);
        }
    };

    request.onerror = event => {
        console.error('Error fetching historical data:', event.target.error);
    };
}

function createOrUpdateChart(level, data) {
    const ctx = document.getElementById(`chart-level-${level}`).getContext('2d');
    
    if (charts[level]) {
        charts[level].data.labels = data.map(d => d.date.toLocaleDateString());
        charts[level].data.datasets[0].data = data.map(d => d.averageTime);
        charts[level].update();
    } else {
        charts[level] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date.toLocaleDateString()),
                datasets: [{
                    label: 'Average Time (seconds)',
                    data: data.map(d => d.averageTime),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Initialize app
setQuestionCount(20); // Set default active button for question count
setOperandCount(2); // Set default active button for operand count
showHomeScreen();
fetchHistoricalData();