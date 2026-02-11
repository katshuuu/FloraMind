const state = {
    currentQuestion: 0,
    answers: {
        forWhom: null,
        age: null,
        colors: null,
        note: null,
        occasion: null
    },
    isGenerating: false,
    isWaitingForNoteText: false
};

// Вопросы для опроса
const questions = [
    {
        id: 'forWhom',
        text: 'Для кого букет?',
        options: [
            { text: 'Для жены/мужа', icon: 'fas fa-heart', value: 'супруг(а)' },
            { text: 'Для мамы/папы', icon: 'fas fa-home', value: 'родитель' },
            { text: 'Для девушки/парня', icon: 'fas fa-user-friends', value: 'возлюбленный(ая)' },
            { text: 'Коллеге на день рождения', icon: 'fas fa-briefcase', value: 'коллега' },
            { text: 'Подруге/другу', icon: 'fas fa-user', value: 'друг' },
            { text: 'Себе в офис/домой', icon: 'fas fa-building', value: 'себе' }
        ]
    },
    {
        id: 'occasion',
        text: 'Какой повод для букета? 💐',
        options: [
            { text: '8 марта', icon: 'fas fa-female', value: '8 марта' },
            { text: 'Свадьба', icon: 'fas fa-ring', value: 'свадьба' },
            { text: 'День рождения', icon: 'fas fa-birthday-cake', value: 'день рождения' },
            { text: 'Годовщина отношений', icon: 'fas fa-heart', value: 'годовщина' },
            { text: 'Просто так/без повода', icon: 'fas fa-surprise', value: 'без повода' },
            { text: 'Извинение', icon: 'fas fa-dove', value: 'извинение' }
        ]
    },
    {
        id: 'age',
        text: 'Какой возраст получателя?',
        options: [
            { text: 'Ребенок (до 12 лет)', icon: 'fas fa-child', value: 'ребенок' },
            { text: 'Подросток (13-19 лет)', icon: 'fas fa-user-graduate', value: 'подросток' },
            { text: 'Молодой (20-35 лет)', icon: 'fas fa-user', value: 'молодой' },
            { text: 'Взрослый (36-55 лет)', icon: 'fas fa-user-tie', value: 'взрослый' },
            { text: 'Пожилая женщина/мужчина', icon: 'fas fa-user-friends', value: 'пожилой' },
            { text: 'Не важно', icon: 'fas fa-times', value: 'не важно' }
        ]
    },
    {
        id: 'colors',
        text: 'Какие цвета предпочтительны?',
        options: [
            { text: 'Нежные пастельные', icon: 'fas fa-pastafarianism', value: 'пастельные', color: '#ffd6e7' },
            { text: 'Яркие и сочные', icon: 'fas fa-fire', value: 'яркие', color: '#ff6b6b' },
            { text: 'Бело-зеленые', icon: 'fas fa-leaf', value: 'бело-зеленые', color: '#51cf66' },
            { text: 'Классические красные', icon: 'fas fa-heart', value: 'красные', color: '#ff6b6b' },
            { text: 'Розовые тона', icon: 'fas fa-heart', value: 'розовые', color: '#ff8787' },
            { text: 'Синие/фиолетовые', icon: 'fas fa-moon', value: 'синие', color: '#748ffc' }
        ]
    },
    {
        id: 'note',
        text: 'Нужна ли записка к букету?',
        options: [
            { text: 'Да, с текстом "С днем рождения!"', icon: 'fas fa-birthday-cake', value: 'с днем рождения' },
            { text: 'Да, с романтичным текстом', icon: 'fas fa-heart', value: 'романтичная' },
            { text: 'Да, со своим текстом', icon: 'fas fa-pen', value: 'своя' },
            { text: 'Да, стандартная открытка', icon: 'fas fa-envelope', value: 'стандартная' },
            { text: 'Нет, записка не нужна', icon: 'fas fa-times', value: 'нет' },
            { text: 'Пока не знаю', icon: 'fas fa-question', value: 'не знаю' }
        ]
    }
];

// Элементы DOM
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const closeBtn = document.getElementById('closeBtn');
const chatInputContainer = document.getElementById('chatInputContainer');
const creationProgress = document.getElementById('creationProgress');
const progressFill = document.getElementById('progressFill');
const progressStep = document.getElementById('progressStep');
const root = document.documentElement;

// Функция для обновления прогресс-бара
function updateProgressBar() {
    const progress = ((state.currentQuestion) / 5) * 100;
    root.style.setProperty('--progress', `${progress}%`);
    progressFill.style.width = `${progress}%`;
    progressStep.textContent = state.currentQuestion === 6 ? 'Генерация букета...' : `Вопрос ${state.currentQuestion + 1} из 5`;
}

// Функция для показа индикатора набора
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingDiv;
}

// Функция для удаления индикатора набора
function removeTypingIndicator(typingElement) {
    if (typingElement && typingElement.parentNode) {
        typingElement.remove();
    }
}

// Функция для добавления сообщения в чат
function addMessage(text, isUser = false, options = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    let messageHTML = `
                <div class="message-header">
                    <i class="fas ${isUser ? 'fa-user' : 'fa-spa'}"></i>
                    <span>${isUser ? 'Вы' : 'FloraAI'}</span>
                </div>
                <p>${text}</p>
            `;

    // Если переданы опции, добавляем их
    if (options && !isUser) {
        messageHTML += `
                    <div class="options-container">
                        <div class="options-title">Выберите подходящий вариант:</div>
                        <div class="options-grid" id="optionsGrid">
                `;

        options.forEach((option, index) => {
            messageHTML += `
                        <button class="option-btn" data-index="${index}" data-value="${option.value}">
                            <div class="option-icon">
                                <i class="${option.icon}"></i>
                            </div>
                            ${option.text}
                        </button>
                    `;
        });

        messageHTML += `
                        </div>
                    </div>
                `;
    }

    messageDiv.innerHTML = messageHTML;
    chatMessages.appendChild(messageDiv);

    // Добавляем обработчики для кнопок опций
    if (options && !isUser) {
        setTimeout(() => {
            const optionButtons = messageDiv.querySelectorAll('.option-btn');
            optionButtons.forEach(button => {
                button.addEventListener('click', function () {
                    const index = parseInt(this.getAttribute('data-index'));
                    const value = this.getAttribute('data-value');

                    // Убираем выделение со всех кнопок
                    optionButtons.forEach(btn => btn.classList.remove('selected'));
                    // Выделяем выбранную кнопку
                    this.classList.add('selected');

                    // Сохраняем ответ
                    handleOptionSelect(value);
                });
            });
        }, 100);
    }

    // Прокручиваем вниз
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

// Функция обработки выбора опции
function handleOptionSelect(value) {
    const currentQuestion = questions[state.currentQuestion];
    state.answers[currentQuestion.id] = value;

    // Показываем выбранный ответ от пользователя
    const selectedOption = currentQuestion.options.find(opt => opt.value === value);
    addMessage(selectedOption.text, true);

    // ЕСЛИ пользователь выбрал "свой текст записки"
    if (currentQuestion.id === 'note' && value === 'своя') {
        state.isWaitingForNoteText = true;
        addMessage('Напишите текст записки ✍️', false);

        // показываем поле ввода ПОСЛЕ сообщения
        setTimeout(() => {
            chatInputContainer.style.display = 'flex';
            userInput.focus();
        }, 400);

        return; //  НЕ переходим к следующему вопросу
    }

    // Переходим к следующему вопросу
    setTimeout(() => {
        state.currentQuestion++;

        if (state.currentQuestion < questions.length) {
            // Задаем следующий вопрос
            askNextQuestion();
        } else {
            // Все вопросы заданы, начинаем генерацию букета
            startBouquetGeneration();
        }

        updateProgressBar();
    }, 800);
}

// Функция для задания следующего вопроса
function askNextQuestion() {
    const typingIndicator = showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator(typingIndicator);

        const question = questions[state.currentQuestion];
        addMessage(question.text, false, question.options);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// Функция для начала генерации букета
function startBouquetGeneration() {
    state.isGenerating = true;

    // Скрываем прогресс-бар вопросов
    creationProgress.style.display = 'none';

    // Показываем индикатор генерации
    const typingIndicator = showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator(typingIndicator);

        // Показываем сообщение о начале генерации
        addMessage("Отлично! Я получила все ваши ответы🌸 Сейчас создаю уникальный букет специально для вас...", false);

        // Имитируем процесс генерации
        setTimeout(() => {
            showGeneratedBouquet();
            chatMessages.appendChild(resultDiv);
        }, 2500);
    }, 1500);
}

// Функция для показа сгенерированного букета
function showGeneratedBouquet() {
    // Генерируем описание на основе ответов
    const bouquetDescription = generateBouquetDescription();

    const resultHTML = `
                <div class="bouquet-result">
                    <div class="result-header">
                        <div class="result-icon">
                            <i class="fas fa-magic"></i>
                        </div>
                        <div class="result-title">Ваш уникальный букет готов!</div>
                    </div>
                    
                    <div class="bouquet-image-container">
                        <div class="image-placeholder" id="imagePlaceholder">
                            <i class="fas fa-spinner fa-spin"></i>
                            <div class="generating-text">Генерация изображения...</div>
                        </div>
                        <img class="bouquet-image" id="bouquetImage" src="" alt="Ваш уникальный букет">
                    </div>
                    
                    <div class="bouquet-description" id="bouquetDescription">
                        ${bouquetDescription}
                    </div>
                    
                    <div class="bouquet-details">
                        <div class="detail-card">
                            <div class="detail-card-title">Для кого</div>
                            <div class="detail-card-value">${getOptionText('forWhom')}</div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-card-title">Возраст</div>
                            <div class="detail-card-value">${getOptionText('age')}</div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-card-title">Цвета</div>
                            <div class="detail-card-value">${getOptionText('colors')}</div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-card-title">Повод</div>
                            <div class="detail-card-value">${getOptionText('occasion')}</div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-btn order-btn" id="orderBtn">
                            <i class="fab fa-telegram"></i> Связаться с флористом 🌸
                        </button>
                        <button class="action-btn restart-btn" id="restartBtn">
                            <i class="fas fa-redo"></i> Создать новый букет
                        </button>
                    </div>
                </div>
            `;

    // Создаем элемент результата
    const resultDiv = document.createElement('div');
    resultDiv.innerHTML = resultHTML;
    chatMessages.appendChild(resultDiv);

    // Имитируем генерацию изображения
    simulateImageGeneration();

    // Добавляем обработчики кнопок
    document.getElementById('orderBtn').addEventListener('click', connectToFlorist);
    document.getElementById('restartBtn').addEventListener('click', restartQuestionnaire);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Функция для получения текста опции по ID вопроса
function getOptionText(questionId) {
    const question = questions.find(q => q.id === questionId);
    const option = question.options.find(opt => opt.value === state.answers[questionId]);
    return option ? option.text : 'Не указано';
}

// Функция для генерации описания букета
function generateBouquetDescription() {
    const descriptions = {
        'супруг(а)': 'Этот букет создан специально для вашей второй половинки. Каждый цветок в нём символизирует разные грани ваших отношений: страсть, нежность, верность и вечную любовь.',
        'родитель': 'Композиция, наполненная теплотой и благодарностью. Цветы подобраны так, чтобы выразить всю глубину ваших чувств к самому близкому человеку.',
        'возлюбленный(ая)': 'Романтичный букет, который говорит без слов. Нежные оттенки и изящные формы создают атмосферу зарождающихся чувств и особенной связи.',
        'коллега': 'Элегантная и сдержанная композиция, идеально подходящая для деловой среды. Выражает уважение и признательность, сохраняя профессиональный тон.',
        'друг': 'Жизнерадостный и непринуждённый букет, который станет прекрасным способом сказать "я ценю нашу дружбу".',
        'себе': 'Букет для тех, кто ценит красоту вокруг себя. Композиция, которая будет радовать вас каждый день и создавать особое настроение.'
    };

    const baseDescription = descriptions[state.answers.forWhom] || 'Уникальная композиция, созданная специально для вашего случая.';

    // Добавляем детали по цветам
    let colorDescription = '';
    if (state.answers.colors === 'пастельные') {
        colorDescription = 'Нежные пастельные оттенки создают ощущение лёгкости и чистоты, как утренний туман над цветущим лугом.';
    } else if (state.answers.colors === 'яркие') {
        colorDescription = 'Яркие, сочные цвета наполняют композицию энергией и жизнерадостностью, притягивая взгляды и поднимая настроение.';
    } else if (state.answers.colors === 'бело-зеленые') {
        colorDescription = 'Гармония белого и зелёного создаёт ощущение свежести и чистоты, напоминая о весеннем пробуждении природы.';
    }

    // Добавляем детали по поводу
    let occasionDescription = '';
    if (state.answers.occasion === 'день рождения') {
        occasionDescription = 'Идеально подобран для дня рождения — каждый цветок несёт пожелание счастья, здоровья и радости на весь следующий год.';
    } else if (state.answers.occasion === '8 марта') {
        occasionDescription = 'Весенняя композиция, созданная специально для Международного женского дня, символизирует пробуждение, красоту и нежность.';
    } else if (state.answers.occasion === 'годовщина') {
        occasionDescription = 'Этот букет рассказывает историю ваших отношений — от первых нежных чувств до глубокой привязанности, которая с годами только крепнет.';
    }

    return `${baseDescription} ${colorDescription} ${occasionDescription} Я тщательно подобрала каждый элемент, чтобы создать гармоничную композицию, которая будет радовать получателя и точно передаст ваши чувства.`;
}

// Функция для имитации генерации изображения
function simulateImageGeneration() {
    setTimeout(() => {
        const imagePlaceholder = document.getElementById('imagePlaceholder');
        const bouquetImage = document.getElementById('bouquetImage');

        // Создаем "сгенерированное" изображение на основе ответов
        // В реальном приложении здесь будет запрос к ИИ для генерации изображения

        // Определяем цветовую схему для изображения
        let colorTheme = 'pastel';
        if (state.answers.colors === 'яркие') colorTheme = 'bright';
        if (state.answers.colors === 'красные') colorTheme = 'red';
        if (state.answers.colors === 'синие') colorTheme = 'blue';

        // Определяем тип букета
        let bouquetType = 'romantic';
        if (state.answers.forWhom === 'коллега') bouquetType = 'elegant';
        if (state.answers.forWhom === 'себе') bouquetType = 'minimalist';
        if (state.answers.occasion === 'свадьба') bouquetType = 'wedding';

        // Используем заглушку с разными цветами в зависимости от выбора
        // В реальном приложении здесь будет запрос к DALL-E, Stable Diffusion или другому ИИ

        // Создаем градиент на основе выбранных цветов
        const gradients = {
            'пастельные': 'linear-gradient(135deg, #ffd6e7 0%, #c8f7c5 50%, #a6dcef 100%)',
            'яркие': 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 50%, #6bcf7f 100%)',
            'бело-зеленые': 'linear-gradient(135deg, #ffffff 0%, #c8f7c5 50%, #51cf66 100%)',
            'красные': 'linear-gradient(135deg, #ff6b6b 0%, #ff8787 50%, #ffa8a8 100%)',
            'розовые': 'linear-gradient(135deg, #ff8787 0%, #fcc2d7 50%, #e599f7 100%)',
            'синие': 'linear-gradient(135deg, #748ffc 0%, #3bc9db 50%, #38d9a9 100%)'
        };

        const gradient = gradients[state.answers.colors] || gradients['пастельные'];

        // Скрываем плейсхолдер и показываем "сгенерированное" изображение
        imagePlaceholder.style.display = 'none';
        bouquetImage.style.display = 'block';

        // Создаем canvas для "генерации" изображения
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        // Рисуем градиентный фон
        const bgGradient = ctx.createLinearGradient(0, 0, 600, 400);
        bgGradient.addColorStop(0, gradient.split(' ')[2]);
        bgGradient.addColorStop(0.5, gradient.split(' ')[4]);
        bgGradient.addColorStop(1, gradient.split(' ')[6]);

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 600, 400);

        // Рисуем простые фигуры в виде цветов
        drawFlowers(ctx, colorTheme, bouquetType);

        // Конвертируем canvas в data URL
        bouquetImage.src = canvas.toDataURL('image/png');

        // Добавляем небольшой текст об "искусственном интеллекте"
        addMessage("Изображение букета было сгенерировано искусственным интеллектом на основе ваших предпочтений. В реальной жизни наш флорист воссоздаст эту композицию с живыми цветами!", false);

    }, 2000);
}

// Функция для рисования простых цветов на canvas
function drawFlowers(ctx, colorTheme, bouquetType) {
    // Определяем цвета в зависимости от темы
    let flowerColors, stemColor;

    switch (colorTheme) {
        case 'bright':
            flowerColors = ['#ff6b6b', '#ffd93d', '#51cf66', '#339af0'];
            stemColor = '#2b8a3e';
            break;
        case 'red':
            flowerColors = ['#ff6b6b', '#ff8787', '#ffa8a8'];
            stemColor = '#2b8a3e';
            break;
        case 'blue':
            flowerColors = ['#339af0', '#748ffc', '#5c7cfa'];
            stemColor = '#2b8a3e';
            break;
        default: // pastel
            flowerColors = ['#ffd6e7', '#c8f7c5', '#a6dcef', '#e599f7'];
            stemColor = '#51cf66';
    }

    // Определяем количество и расположение цветов в зависимости от типа букета
    let flowerCount, positions;

    switch (bouquetType) {
        case 'elegant':
            flowerCount = 7;
            positions = [
                { x: 300, y: 200, size: 40 },
                { x: 250, y: 180, size: 30 },
                { x: 350, y: 180, size: 30 },
                { x: 220, y: 220, size: 25 },
                { x: 380, y: 220, size: 25 },
                { x: 280, y: 250, size: 20 },
                { x: 320, y: 250, size: 20 }
            ];
            break;
        case 'minimalist':
            flowerCount = 5;
            positions = [
                { x: 300, y: 200, size: 35 },
                { x: 270, y: 180, size: 25 },
                { x: 330, y: 180, size: 25 },
                { x: 250, y: 220, size: 20 },
                { x: 350, y: 220, size: 20 }
            ];
            break;
        case 'wedding':
            flowerCount = 9;
            positions = [
                { x: 300, y: 200, size: 45 },
                { x: 250, y: 170, size: 35 },
                { x: 350, y: 170, size: 35 },
                { x: 220, y: 210, size: 30 },
                { x: 380, y: 210, size: 30 },
                { x: 270, y: 230, size: 25 },
                { x: 330, y: 230, size: 25 },
                { x: 240, y: 250, size: 20 },
                { x: 360, y: 250, size: 20 }
            ];
            break;
        default: // romantic
            flowerCount = 8;
            positions = [
                { x: 300, y: 200, size: 40 },
                { x: 260, y: 180, size: 35 },
                { x: 340, y: 180, size: 35 },
                { x: 230, y: 210, size: 30 },
                { x: 370, y: 210, size: 30 },
                { x: 280, y: 230, size: 25 },
                { x: 320, y: 230, size: 25 },
                { x: 300, y: 260, size: 20 }
            ];
    }

    // Рисуем стебли
    positions.forEach(pos => {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y + pos.size / 2);
        ctx.lineTo(pos.x, 380);
        ctx.lineWidth = 3;
        ctx.strokeStyle = stemColor;
        ctx.stroke();
    });

    // Рисуем цветы
    positions.forEach((pos, index) => {
        const color = flowerColors[index % flowerColors.length];

        // Рисуем лепестки
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const petalX = pos.x + Math.cos(angle) * pos.size * 0.8;
            const petalY = pos.y + Math.sin(angle) * pos.size * 0.8;

            ctx.beginPath();
            ctx.ellipse(petalX, petalY, pos.size * 0.4, pos.size * 0.6, angle, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Рисуем центр цветка
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = colorTheme === 'bright' ? '#ffd93d' : '#ffffff';
        ctx.fill();
    });
}

// Функция для связи с флористом
function connectToFlorist() {
    // Формируем сообщение для флориста на основе ответов
    const orderDetails =
        `Новый заказ от FloraAI:

📋 Детали букета:
• Для кого: ${getOptionText('forWhom')}
• Возраст: ${getOptionText('age')}
• Цвета: ${getOptionText('colors')}
• Записка: ${getOptionText('note')}
• Повод: ${getOptionText('occasion')}

Изображение букета сгенерировано ИИ.`;

    // В реальном приложении здесь будет интеграция с Telegram ботом
    // Например, через Telegram Bot API

    // Показываем сообщение о переходе в Telegram
    addMessage("Отлично! Сейчас я перенаправлю вас в наш Telegram-чат с флористом, где вы сможете уточнить детали заказа и указать адрес доставки. 🌸", false);

    // Создаем ссылку на Telegram бота
    // В реальном приложении здесь будет реальная ссылка на бота
    const telegramBotUrl = "https://t.me/FloraAI_Florist_Bot";

    // Открываем ссылку в новом окне
    setTimeout(() => {
        window.open(telegramBotUrl, '_blank');

        // Добавляем инструкцию
        addMessage(`Если переход не произошел автоматически, перейдите по ссылке: <a href="${telegramBotUrl}" target="_blank">${telegramBotUrl}</a><br><br>В чате с флористом отправьте сообщение: "Хочу заказать букет, сгенерированный FloraAI"`, false);
    }, 1500);
}

// Функция для перезапуска опроса
function restartQuestionnaire() {
    // Сбрасываем состояние
    state.currentQuestion = 0;
    state.answers = {
        forWhom: null,
        age: null,
        colors: null,
        note: null,
        occasion: null,
        chocolate: null
    };
    state.isGenerating = false;

    // Очищаем чат
    chatMessages.innerHTML = '';

    // Показываем прогресс-бар
    creationProgress.style.display = 'flex';

    // Начинаем заново
    addMessage("Отлично! Давайте создадим новый букет. 🌸", false);
    updateProgressBar();

    setTimeout(() => {
        askNextQuestion();
    }, 1500);
}

// Инициализация чата
function initChat() {
    updateProgressBar();

    // Начинаем опрос через 2 секунды
    setTimeout(() => {
        askNextQuestion();
    }, 2000);
}

// Обработчики событий
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, true);
    userInput.value = '';
    userInput.style.height = 'auto';

    // если ждём текст записки
    if (state.isWaitingForNoteText) {
        state.answers.note = message; // сохраняем записку
        state.isWaitingForNoteText = false;

        state.currentQuestion++;
        updateProgressBar();

        setTimeout(() => {
            if (state.currentQuestion < questions.length) {
                askNextQuestion();
            } else {
                startBouquetGeneration();
            }
        }, 600);
    }
});


userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

closeBtn.addEventListener('click', () => {
    if (window.opener) {
        window.close();
    } else {
        addMessage("Спасибо за использование FloraAI! Если решите создать букет позже, мы всегда готовы помочь. 🌸", false);
    }
});

// Запуск чата при загрузке
window.addEventListener('load', initChat);
