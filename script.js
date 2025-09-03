// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9SsU8Vo6KZ6tVgWLgMAnFvxSjkdWFvSs",
  authDomain: "dictionary-b9011.firebaseapp.com",
  projectId: "dictionary-b9011",
  storageBucket: "dictionary-b9011.firebasestorage.app",
  messagingSenderId: "903569261596",
  appId: "1:903569261596:web:e64458f595c84af01a4bd9",
  measurementId: "G-44VP97P941"
};

// Global variables and references to HTML elements
let addWordBtn, addFolderBtn, studyCardsBtn, contentArea, exportBtn, importFile;
let authBtn, searchInput;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let dictionary = {
    folders: [],
    words: []
};
let userId = null;

// Initial rendering and data loading
document.addEventListener('DOMContentLoaded', () => {
    // Присвоєння змінних елементам DOM
    addWordBtn = document.getElementById('add-word-btn');
    addFolderBtn = document.getElementById('add-folder-btn');
    studyCardsBtn = document.getElementById('study-cards-btn');
    contentArea = document.getElementById('content-area');
    exportBtn = document.getElementById('export-btn');
    importFile = document.getElementById('import-file');
    authBtn = document.getElementById('auth-btn');
    searchInput = document.getElementById('searchInput');

    // Обробники подій
    authBtn.addEventListener('click', () => {
        if (userId) {
            signOut(auth);
        } else {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider);
        }
    });

    addWordBtn.addEventListener('click', () => {
        if (!userId) {
            alert('Будь ласка, увійдіть, щоб додавати слова!');
            return;
        }
        renderContent('addWord');
    });

    addFolderBtn.addEventListener('click', () => {
        if (!userId) {
            alert('Будь ласка, увійдіть, щоб додавати папки!');
            return;
        }
        renderContent('addFolder');
    });

    studyCardsBtn.addEventListener('click', () => {
        if (!userId) {
            alert('Будь ласка, увійдіть, щоб вивчати слова!');
            return;
        }
        renderStudyCards();
    });

    exportBtn.addEventListener('click', exportData);
    importFile.addEventListener('change', importData);

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        if (query.length > 0) {
            renderSearchResults(query);
        } else {
            renderFolders();
        }
    });

    renderContent('main');
});

// Functions to work with data (saving and loading)
function saveData() {
    if (userId) {
        localStorage.setItem(`myDictionary_${userId}`, JSON.stringify(dictionary));
    }
}

function loadData() {
    if (userId) {
        const storedData = localStorage.getItem(`myDictionary_${userId}`);
        if (storedData) {
            dictionary = JSON.parse(storedData);
        }
    }
}

// Firebase Synchronization functions
async function saveToFirebase() {
    if (!userId) return;
    try {
        await setDoc(doc(db, 'users', userId), {
            folders: dictionary.folders,
            words: dictionary.words,
        });
        console.log('Дані успішно синхронізовано з Firebase.');
    } catch (e) {
        console.error('Помилка при синхронізації з Firebase:', e);
    }
}

async function loadFromFirebase() {
    if (!userId) return;
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const firebaseData = docSnap.data();
            dictionary = firebaseData;
            saveData();
        } else {
            console.log('Дані користувача не знайдено в Firebase. Використовуємо локальні або нові.');
        }
        renderFolders();
    } catch (e) {
        console.error('Помилка при завантаженні з Firebase:', e);
    }
}

// Functions to render different parts of the UI
function renderContent(view) {
    contentArea.innerHTML = '';
    if (view === 'main') {
        renderFolders();
    } else if (view === 'addWord') {
        renderAddWordForm();
    } else if (view === 'addFolder') {
        renderAddFolderForm();
    } else if (view === 'studyCards') {
        renderStudyCards();
    }
}

function renderFolders() {
    contentArea.innerHTML = `<h2>Твої папки</h2>`;
    const folderList = document.createElement('ul');
    folderList.classList.add('folder-list');

    if (dictionary.folders.length === 0) {
        contentArea.innerHTML += `<p>Папок ще немає. Створи свою першу папку!</p>`;
        const createFolderButton = document.createElement('button');
        createFolderButton.textContent = 'Створити папку';
        createFolderButton.id = 'create-first-folder-btn';
        contentArea.appendChild(createFolderButton);
        createFolderButton.addEventListener('click', () => {
            renderContent('addFolder');
        });
    } else {
        dictionary.folders.forEach(folder => {
            const folderItem = document.createElement('li');
            folderItem.innerHTML = `
                <div class="folder-item-wrapper">
                    <button class="folder-btn" data-folder-id="${folder.id}">${folder.name}</button>
                    <button class="edit-folder-btn" data-folder-id="${folder.id}">Редагувати</button>
                    <button class="delete-btn" data-folder-id="${folder.id}">Видалити</button>
                </div>
            `;
            folderItem.querySelector('.folder-btn').addEventListener('click', () => {
                renderFolderContent(folder.id);
            });
            folderItem.querySelector('.edit-folder-btn').addEventListener('click', (event) => {
                const folderIdToEdit = event.target.dataset.folderId;
                editFolderForm(folderIdToEdit);
            });
            folderItem.querySelector('.delete-btn').addEventListener('click', (event) => {
                const folderIdToDelete = event.target.dataset.folderId;
                deleteFolder(folderIdToDelete);
            });
            folderList.appendChild(folderItem);
        });
        contentArea.appendChild(folderList);
    }
}

function renderFolderContent(folderId) {
    const currentFolder = dictionary.folders.find(f => f.id == folderId);
    if (!currentFolder) {
        renderFolders();
        return;
    }

    contentArea.innerHTML = `
        <button id="back-to-main" class="back-btn">&#8592; Назад</button>
        <h2>Папка: ${currentFolder.name}</h2>
        <div class="filter-controls">
            <div class="action-controls">
                <button id="mark-all-learned-btn">Позначити все як вивчене</button>
                <button id="mark-all-unlearned-btn">Позначити все як невивчене</button>
            </div>
            <div class="status-filter">
                <label for="wordStatusFilter">Статус слів:</label>
                <select id="wordStatusFilter">
                    <option value="all">Всі слова</option>
                    <option value="unlearned">Невивчені</option>
                    <option value="learned">Вивчені</option>
                </select>
            </div>
        </div>
        <div id="words-list"></div>
    `;

    document.getElementById('back-to-main').addEventListener('click', () => {
        renderFolders();
    });

    const wordsInFolder = dictionary.words.filter(word => word.folderId == folderId);
    displayWords(wordsInFolder, folderId);

    document.getElementById('mark-all-learned-btn').addEventListener('click', () => markAllAsLearned(folderId));
    document.getElementById('mark-all-unlearned-btn').addEventListener('click', () => markAllAsUnlearned(folderId));

    document.getElementById('wordStatusFilter').addEventListener('change', (event) => {
        const selectedStatus = event.target.value;
        let filteredWords = wordsInFolder;

        if (selectedStatus === 'unlearned') {
            filteredWords = wordsInFolder.filter(word => !word.learned);
        } else if (selectedStatus === 'learned') {
            filteredWords = wordsInFolder.filter(word => word.learned);
        }

        displayWords(filteredWords, folderId);
    });
}

function markAllAsLearned(folderId) {
    dictionary.words.forEach(word => {
        if (word.folderId == folderId) {
            word.learned = true;
        }
    });
    saveData();
    saveToFirebase();
    renderFolderContent(folderId);
}

function markAllAsUnlearned(folderId) {
    dictionary.words.forEach(word => {
        if (word.folderId == folderId) {
            word.learned = false;
        }
    });
    saveData();
    saveToFirebase();
    renderFolderContent(folderId);
}

function displayWords(words, folderId) {
    words.sort((a, b) => {
        const wordA = a.word.toLowerCase();
        const wordB = b.word.toLowerCase();
        if (wordA < wordB) return -1;
        if (wordA > wordB) return 1;
        return 0;
    });

    const wordsListDiv = document.getElementById('words-list');
    wordsListDiv.innerHTML = '';

    if (words.length === 0) {
        wordsListDiv.innerHTML = `<p>У цій папці поки немає слів. Додай нові слова!</p>`;
    } else {
        words.forEach(word => {
            wordsListDiv.innerHTML += `
                <div class="word-card">
                    <h3>${word.word}</h3>
                    <p><strong>Переклад:</strong> ${word.translation}</p>
                    ${word.pronunciation ? `<p><strong>Вимова:</strong> ${word.pronunciation}</p>` : ''}
                    ${word.synonyms ? `<p><strong>Синоніми:</strong> ${word.synonyms}</p>` : ''}
                    ${word.sentence ? `<p><strong>Речення:</strong> ${word.sentence}</p>` : ''}
                    ${word.antonyms ? `<p><strong>Антоніми:</strong> ${word.antonyms}</p>` : ''}
                    <p><strong>Статус:</strong> ${word.learned ? 'Вивчене ✅' : 'Невивчене ❌'}</p>
                    <div class="word-card-actions">
                        <button class="toggle-learned-btn" data-word-id="${word.id}">${word.learned ? 'Зробити невивченим' : 'Зробити вивченим'}</button>
                        <button class="edit-word-btn" data-word-id="${word.id}">Редагувати</button>
                        <button class="delete-word-btn" data-word-id="${word.id}">Видалити слово</button>
                    </div>
                </div>
            `;
        });

        document.querySelectorAll('.edit-word-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const wordIdToEdit = event.target.dataset.wordId;
                editWordForm(wordIdToEdit);
            });
        });
        document.querySelectorAll('.delete-word-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const wordIdToDelete = event.target.dataset.wordId;
                deleteWord(wordIdToDelete, folderId);
            });
        });
        document.querySelectorAll('.toggle-learned-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const wordIdToToggle = event.target.dataset.wordId;
                toggleLearnedStatus(wordIdToToggle);
                renderFolderContent(folderId);
            });
        });
    }
}

function renderAddWordForm() {
    const folders = dictionary.folders;

    let htmlContent = `<button id="back-to-main" class="back-btn">&#8592; Назад</button>`;

    if (folders.length === 0) {
        htmlContent += `
            <h2>Додати нове слово</h2>
            <p>Спочатку потрібно створити хоча б одну папку, щоб додати в неї слово.</p>
        `;
    } else {
        const folderOptions = `
            <label for="wordFolder">Папка*:</label>
            <select id="wordFolder" name="wordFolder" required>
                ${folders.map(folder => `<option value="${folder.id}">${folder.name}</option>`).join('')}
            </select>
        `;
        htmlContent += `
            <h2>Додати нове слово</h2>
            <form id="add-word-form">
                <p>Поля з позначкою * є обов'язковими.</p>
                ${folderOptions}
                <label for="wordInput">Слово*:</label>
                <input type="text" id="wordInput" name="word" required>
                <label for="translationInput">Переклад*:</label>
                <input type="text" id="translationInput" name="translation" required>
                <label for="pronunciationInput">Вимова:</label>
                <input type="text" id="pronunciationInput" name="pronunciation">
                <label for="synonymsInput">Синоніми:</label>
                <input type="text" id="synonymsInput" name="synonyms">
                <label for="sentenceInput">Речення:</label>
                <input type="text" id="sentenceInput" name="sentence">
                <label for="antonymsInput">Антоніми:</label>
                <input type="text" id="antonymsInput" name="antonyms">
                <label for="notesInput">Примітки:</label>
                <textarea id="notesInput" name="notes"></textarea>
                <button type="submit">Зберегти слово</button>
            </form>
        `;
    }

    contentArea.innerHTML = htmlContent;

    document.getElementById('back-to-main').addEventListener('click', () => {
        renderFolders();
    });

    if (folders.length > 0) {
        document.getElementById('add-word-form').addEventListener('submit', handleAddWord);
    }
}

function renderAddFolderForm() {
    contentArea.innerHTML = `
        <button id="back-to-main" class="back-btn">&#8592; Назад</button>
        <h2>Створити нову папку</h2>
        <form id="add-folder-form">
            <label for="folderName">Назва папки:</label>
            <input type="text" id="folderName" name="folderName" required>
            <button type="submit">Створити</button>
        </form>
    `;
    document.getElementById('back-to-main').addEventListener('click', () => {
        renderFolders();
    });
    document.getElementById('add-folder-form').addEventListener('submit', handleAddFolder);
}

function renderStudyCards() {
    contentArea.innerHTML = `
        <button id="back-to-main" class="back-btn">&#8592; Назад</button>
        <h2>Картки для вивчення</h2>
        <div id="study-options">
            <div class="cards-controls">
                <label for="study-folder-select">Оберіть папку:</label>
                <select id="study-folder-select">
                    <option value="all">Всі папки</option>
                    ${dictionary.folders.map(folder => `<option value="${folder.id}">${folder.name}</option>`).join('')}
                </select>
                <label for="study-status-select">Статус слів:</label>
                <select id="study-status-select">
                    <option value="all">Всі</option>
                    <option value="unlearned">Невивчені</option>
                    <option value="learned">Вивчені</option>
                </select>
            </div>
            <button id="start-study-btn">Розпочати</button>
        </div>
        <div id="study-area"></div>
    `;

    document.getElementById('back-to-main').addEventListener('click', () => {
        renderFolders();
    });

    const startStudyBtn = document.getElementById('start-study-btn');
    startStudyBtn.addEventListener('click', () => {
        const selectedFolderId = document.getElementById('study-folder-select').value;
        const selectedStatus = document.getElementById('study-status-select').value;
        document.getElementById('study-options').style.display = 'none';
        startStudySession(selectedFolderId, selectedStatus);
    });
}

let currentWordIndex = 0;
let sessionWords = [];

function startStudySession(folderId, status) {
    let filteredWords = dictionary.words;
    if (folderId !== 'all') {
        filteredWords = filteredWords.filter(word => word.folderId == folderId);
    }
    if (status === 'unlearned') {
        filteredWords = filteredWords.filter(word => !word.learned);
    } else if (status === 'learned') {
        filteredWords = filteredWords.filter(word => word.learned);
    }

    sessionWords = filteredWords.sort(() => Math.random() - 0.5);
    currentWordIndex = 0;

    if (sessionWords.length === 0) {
        document.getElementById('study-area').innerHTML = `<p>Слів для вивчення немає. Спробуй змінити фільтри.</p>`;
    } else {
        renderStudyCard();
    }
}

function renderStudyCard() {
    const studyArea = document.getElementById('study-area');
    studyArea.innerHTML = '';

    if (sessionWords.length === 0) {
        studyArea.innerHTML = `<p>Навчання завершено! 👍</p><button id="end-study-btn">Завершити</button>`;
        document.getElementById('end-study-btn').addEventListener('click', () => {
            renderStudyCards();
        });
        return;
    }

    const word = sessionWords[currentWordIndex];

    const cardElement = document.createElement('div');
    cardElement.classList.add('flashcard');
    cardElement.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <h3>${word.word}</h3>
            </div>
            <div class="card-back">
                <p><strong>Переклад:</strong> ${word.translation}</p>
                ${word.pronunciation ? `<p><strong>Вимова:</strong> ${word.pronunciation}</p>` : ''}
                ${word.synonyms ? `<p><strong>Синоніми:</strong> ${word.synonyms}</p>` : ''}
                ${word.sentence ? `<p><strong>Речення:</strong> ${word.sentence}</p>` : ''}
            </div>
        </div>
    `;

    const navElement = document.createElement('div');
    navElement.classList.add('study-nav');
    navElement.innerHTML = `
        <button id="prev-btn" ${currentWordIndex === 0 ? 'disabled' : ''}>&lt; Назад</button>
        <span>${currentWordIndex + 1}/${sessionWords.length}</span>
        <button id="next-btn" ${currentWordIndex === sessionWords.length - 1 ? 'disabled' : ''}>Вперед &gt;</button>
    `;

    const endBtn = document.createElement('button');
    endBtn.id = 'end-study-btn';
    endBtn.textContent = 'Завершити';
    endBtn.style.marginTop = '1rem';

    studyArea.appendChild(cardElement);
    studyArea.appendChild(navElement);
    studyArea.appendChild(endBtn);

    cardElement.addEventListener('click', () => {
        cardElement.classList.toggle('flipped');
    });

    document.getElementById('prev-btn').addEventListener('click', () => {
        currentWordIndex--;
        renderStudyCard();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        currentWordIndex++;
        renderStudyCard();
    });

    document.getElementById('end-study-btn').addEventListener('click', () => {
        renderStudyCards();
    });
}

// Functions for event handling (adding, deleting, editing)
function handleAddWord(event) {
    event.preventDefault();
    const word = document.getElementById('wordInput').value;
    const translation = document.getElementById('translationInput').value;
    const pronunciation = document.getElementById('pronunciationInput').value;
    const synonyms = document.getElementById('synonymsInput').value;
    const sentence = document.getElementById('sentenceInput').value;
    const antonyms = document.getElementById('antonymsInput').value;
    const notes = document.getElementById('notesInput').value;
    const folderId = document.getElementById('wordFolder') ? document.getElementById('wordFolder').value : null;

    if (!word || !translation) {
        alert('Поля "Слово" та "Переклад" є обов\'язковими!');
        return;
    }

    const newWord = {
        id: Date.now(),
        word,
        translation,
        pronunciation,
        synonyms,
        sentence,
        antonyms,
        notes,
        learned: false,
        folderId: folderId
    };

    dictionary.words.push(newWord);
    saveData();
    saveToFirebase();
    renderFolders();
    alert('Слово додано!');
}

function handleAddFolder(event) {
    event.preventDefault();
    const form = event.target;
    const newFolder = {
        name: form.folderName.value,
        id: Date.now()
    };
    dictionary.folders.push(newFolder);
    saveData();
    saveToFirebase();
    renderFolders();
    alert(`Папку "${newFolder.name}" створено!`);
}

function deleteFolder(folderId) {
    if (confirm('Ти впевнений, що хочеш видалити цю папку? Всі слова в ній також будуть видалені.')) {
        dictionary.words = dictionary.words.filter(word => word.folderId != folderId);
        dictionary.folders = dictionary.folders.filter(folder => folder.id != folderId);
        saveData();
        saveToFirebase();
        renderFolders();
        alert('Папку видалено.');
    }
}

function deleteWord(wordId, folderId) {
    const wordToDelete = dictionary.words.find(w => w.id == wordId);
    if (confirm(`Ти впевнений, що хочеш видалити слово "${wordToDelete.word}"?`)) {
        dictionary.words = dictionary.words.filter(w => w.id != wordId);
        saveData();
        saveToFirebase();
        renderFolderContent(folderId);
        alert('Слово видалено.');
    }
}

function toggleLearnedStatus(wordId) {
    const wordObject = dictionary.words.find(w => w.id == wordId);
    if (wordObject) {
        wordObject.learned = !wordObject.learned;
        saveData();
        saveToFirebase();
    }
}

function editWordForm(wordId) {
    const wordToEdit = dictionary.words.find(w => w.id == wordId);
    if (!wordToEdit) return;

    const folderOptions = dictionary.folders.map(folder => {
        const selected = (folder.id == wordToEdit.folderId) ? 'selected' : '';
        return `<option value="${folder.id}" ${selected}>${folder.name}</option>`;
    }).join('');

    contentArea.innerHTML = `
        <button id="back-to-main" class="back-btn">&#8592; Назад</button>
        <h2>Редагувати слово "${wordToEdit.word}"</h2>
        <form id="edit-word-form">
            <p>Поля з позначкою * є обов'язковими.</p>
            <label for="wordFolder">Папка:</label>
            <select id="wordFolder" name="wordFolder">
                ${folderOptions}
            </select>
            <label for="wordInput">Слово*:</label>
            <input type="text" id="wordInput" name="word" value="${wordToEdit.word}" required>
            <label for="translationInput">Переклад*:</label>
            <input type="text" id="translationInput" name="translation" value="${wordToEdit.translation}" required>
            <label for="pronunciationInput">Вимова:</label>
            <input type="text" id="pronunciationInput" name="pronunciation" value="${wordToEdit.pronunciation || ''}">
            <label for="synonymsInput">Синоніми:</label>
            <input type="text" id="synonymsInput" name="synonyms" value="${wordToEdit.synonyms || ''}">
            <label for="sentenceInput">Речення:</label>
            <input type="text" id="sentenceInput" name="sentence" value="${wordToEdit.sentence || ''}">
            <label for="antonymsInput">Антоніми:</label>
            <input type="text" id="antonymsInput" name="antonyms" value="${wordToEdit.antonyms || ''}">
            <label for="notesInput">Примітки:</label>
            <textarea id="notesInput" name="notes">${wordToEdit.notes || ''}</textarea>
            <div class="form-checkbox">
                <input type="checkbox" id="learnedStatus" name="learnedStatus" ${wordToEdit.learned ? 'checked' : ''}>
                <label for="learnedStatus">Слово вивчене</label>
            </div>
            <button type="submit">Зберегти зміни</button>
            <button type="button" id="cancel-edit-btn">Скасувати</button>
        </form>
    `;

    document.getElementById('edit-word-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const learnedStatus = document.getElementById('learnedStatus').checked;
        const newFolderId = document.getElementById('wordFolder').value;
        const updatedWord = {
            id: wordToEdit.id,
            word: document.getElementById('wordInput').value,
            translation: document.getElementById('translationInput').value,
            pronunciation: document.getElementById('pronunciationInput').value,
            synonyms: document.getElementById('synonymsInput').value,
            sentence: document.getElementById('sentenceInput').value,
            antonyms: document.getElementById('antonymsInput').value,
            notes: document.getElementById('notesInput').value,
            learned: learnedStatus,
            folderId: newFolderId
        };
        const index = dictionary.words.findIndex(w => w.id == wordId);
        if (index !== -1) {
            dictionary.words[index] = updatedWord;
            saveData();
            saveToFirebase();
            renderFolderContent(updatedWord.folderId);
            alert('Слово оновлено!');
        }
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        renderFolderContent(wordToEdit.folderId);
    });
}

function editFolderForm(folderId) {
    const folderToEdit = dictionary.folders.find(f => f.id == folderId);
    if (!folderToEdit) return;

    contentArea.innerHTML = `
        <button id="back-to-main" class="back-btn">&#8592; Назад</button>
        <h2>Редагувати папку</h2>
        <form id="edit-folder-form">
            <label for="folderName">Нова назва папки:</label>
            <input type="text" id="folderName" name="folderName" value="${folderToEdit.name}" required>
            <button type="submit">Зберегти</button>
            <button type="button" id="cancel-edit-folder-btn">Скасувати</button>
        </form>
    `;

    document.getElementById('edit-folder-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const newName = document.getElementById('folderName').value;
        const index = dictionary.folders.findIndex(f => f.id == folderId);
        if (index !== -1) {
            dictionary.folders[index].name = newName;
            saveData();
            saveToFirebase();
            renderFolders();
            alert('Назву папки оновлено!');
        }
    });

    document.getElementById('cancel-edit-folder-btn').addEventListener('click', () => {
        renderFolders();
    });
}

// Functions for Export and Import
function exportData() {
    const dataStr = JSON.stringify(dictionary, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_dictionary_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Словник успішно експортовано!');
}

function importData(event) {
    console.log('Крок 1: Запущено функцію importData.');
    const file = event.target.files[0];
    if (!file) {
        console.log('Крок 2: Файл не обрано.');
        return;
    }
    console.log('Крок 2: Файл обрано, починаємо читання.');

    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('Крок 3: Файл прочитано. Спроба розбору JSON.');
        try {
            const importedData = JSON.parse(e.target.result);
            console.log('Крок 4: JSON успішно розібрано. Перевірка формату.');
            if (importedData && importedData.folders && importedData.words) {
                console.log('Крок 5: Формат даних правильний.');
                if (confirm('Ви хочете замінити існуючий словник чи додати нові дані? Натисніть "ОК", щоб замінити, або "Скасувати", щоб додати.')) {
                    dictionary = importedData;
                    alert('Словник успішно замінено!');
                } else {
                    dictionary.folders.push(...importedData.folders);
                    dictionary.words.push(...importedData.words);
                    alert('Дані успішно додано до словника!');
                }
                saveData();
                saveToFirebase();
                renderFolders();
                console.log('Крок 6: Дані оброблено. Функцію завершено.');
            } else {
                console.error('Крок 5: Помилка формату даних. Файл не містить об\'єктів folders або words.');
                alert('Помилка: Некоректний формат файлу. Будь ласка, оберіть файл JSON, експортований з цього додатка.');
            }
        } catch (error) {
            console.error('Крок 4: Помилка при розборі JSON:', error);
            alert('Помилка при читанні файлу. Будь ласка, переконайтесь, що це дійсний файл JSON.');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// Firebase Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        authBtn.textContent = 'Вийти';
        loadFromFirebase();
        console.log('Користувач увійшов:', user.displayName);
    } else {
        userId = null;
        authBtn.textContent = 'Увійти через Google';
        dictionary = {
            folders: [],
            words: []
        };
        saveData();
        renderFolders();
        console.log('Користувач вийшов.');
    }
});
