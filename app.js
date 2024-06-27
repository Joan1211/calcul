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

// Event listeners
document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => startLevel(parseInt(btn.dataset.level)));
});

submitButton.addEventListener('click', checkAnswer);
exitButton.addEventListener('click', exitExercise);
backToHomeButton.addEventListener('click', showHomeScreen);

// Functions
function startLevel(level) {
    currentLevel = level;
    currentExercise = 0;
    exercises = generateExercises(level);
    results = [];
    showExerciseScreen();
    displayNextExercise();
}

function generateExercises(level) {
    const count = 20;
    const exercises = [];
    for (let i = 0; i < count; i++) {
        exercises.push(generateExercise(level));
    }
    return exercises;
}

function generateExercise(level) {
    const numberCount = level + 1;
    const numbers = Array.from({ length: numberCount }, () => Math.floor(Math.random() * 10) + 1);
    const operations = Array.from({ length: numberCount - 1 }, () => Math.random() < 0.5 ? '+' : '-');
    const expression = numbers.reduce((acc, num, index) => 
        index === 0 ? num : `${acc} ${operations[index - 1]} ${num}`, '');
    const answer = eval(expression);
    return { expression, answer };
}

function showExerciseScreen() {
    homeScreen.style.display = 'none';
    exerciseScreen.style.display = 'block';
    resultScreen.style.display = 'none';
}

function displayNextExercise() {
    if (currentExercise < exercises.length) {
        exerciseDisplay.textContent = exercises[currentExercise].expression;
        answerInput.value = '';
        feedbackElement.textContent = '';
    } else {
        showResultScreen();
    }
}

function checkAnswer() {
    const userAnswer = parseInt(answerInput.value);
    const correctAnswer = exercises[currentExercise].answer;
    const isCorrect = userAnswer === correctAnswer;

    results.push({
        exercise: exercises[currentExercise].expression,
        userAnswer,
        correctAnswer,
        isCorrect
    });

    feedbackElement.textContent = isCorrect ? 'Correct!' : `Incorrect. The correct answer is ${correctAnswer}.`;
    currentExercise++;
    
    setTimeout(() => {
        if (currentExercise < exercises.length) {
            displayNextExercise();
        } else {
            showResultScreen();
        }
    }, 1500);
}

function showResultScreen() {
    exerciseScreen.style.display = 'none';
    resultScreen.style.display = 'block';

    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = (correctCount / results.length) * 100;

    resultSummary.innerHTML = `
        <p>Level: ${currentLevel}</p>
        <p>Correct Answers: ${correctCount} out of ${results.length}</p>
        <p>Accuracy: ${accuracy.toFixed(2)}%</p>
    `;

    saveResults();
}

function saveResults() {
    const transaction = db.transaction(['results'], 'readwrite');
    const objectStore = transaction.objectStore('results');

    const result = {
        date: new Date(),
        level: currentLevel,
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
    let exercisesByLevel = {1: 0, 2: 0, 3: 0};

    request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const result = cursor.value;
            totalExercises += result.exercises.length;
            correctAnswers += result.exercises.filter(e => e.isCorrect).length;
            exercisesByLevel[result.level] += result.exercises.length;
            cursor.continue();
        } else {
            // All results processed, update the stats display
            const accuracy = totalExercises > 0 ? (correctAnswers / totalExercises * 100).toFixed(2) : 0;
            statsContent.innerHTML = `
                <p>Total Exercises: ${totalExercises}</p>
                <p>Correct Answers: ${correctAnswers}</p>
                <p>Accuracy: ${accuracy}%</p>
                <p>Level 1: ${exercisesByLevel[1]} | Level 2: ${exercisesByLevel[2]} | Level 3: ${exercisesByLevel[3]}</p>
            `;
        }
    };

    request.onerror = event => {
        console.error('Error fetching daily stats:', event.target.error);
        statsContent.innerHTML = '<p>Unable to load today\'s stats.</p>';
    };
}

// Initialize app
showHomeScreen();