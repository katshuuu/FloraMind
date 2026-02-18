require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2; // Добавляем Cloudinary

const app = express();

// Middleware
app.use(cors({
    origin: ['http://127.0.0.1:5501', 'http://localhost:5501', 'http://localhost:3000', 'https://floramind-7idk.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Конфигурация Yandex Cloud
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

// Конфигурация Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Проверка конфигурации
if (!YANDEX_FOLDER_ID || !YANDEX_API_KEY) {
    console.error('❌ Yandex Cloud credentials not found in .env file');
    process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary credentials not found in .env file');
    process.exit(1);
}

// Создаем папки (оставляем для временных файлов, но они больше не нужны для хранения)
fs.ensureDirSync('./temp');

// URL для YandexART API
const YANDEX_ART_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync';

// Хранилище для запросов и результатов
const generationRequests = new Map();
const orderStatuses = new Map();

// Функция ожидания генерации изображения
async function waitForImage(operationId) {
    console.log(`⏳ Ожидание генерации, ID операции: ${operationId}`);
    
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(
                `https://operation.api.cloud.yandex.net/operations/${operationId}`,
                {
                    headers: {
                        'Authorization': `Api-Key ${YANDEX_API_KEY}`
                    }
                }
            );

            if (response.data.done) {
                if (response.data.error) {
                    throw new Error(`Ошибка генерации: ${response.data.error.message}`);
                }
                
                if (response.data.response && response.data.response.image) {
                    return response.data.response.image;
                }
                throw new Error('Ответ не содержит изображение');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('❌ Ошибка при проверке статуса:', error.message);
            throw error;
        }
    }
    
    throw new Error('Превышено время ожидания генерации');
}

// Генерация изображения через YandexART
async function generateWithYandexART(prompt) {
    try {
        console.log('🎨 Начинаем генерацию изображения...');
        console.log('📝 Промпт:', prompt);

        const requestBody = {
            modelUri: `art://${YANDEX_FOLDER_ID}/yandex-art/latest`,
            messages: [
                {
                    text: prompt,
                    weight: 1
                }
            ],
            generationOptions: {
                seed: Math.floor(Math.random() * 1000000),
                format: "JPEG",
                aspectRatio: {
                    widthRatio: 1,
                    heightRatio: 1
                }
            }
        };

        const response = await axios.post(YANDEX_ART_URL, requestBody, {
            headers: {
                'Authorization': `Api-Key ${YANDEX_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.data.id) {
            return await waitForImage(response.data.id);
        } else if (response.data.image) {
            return response.data.image;
        } else {
            throw new Error('Неожиданный формат ответа от API');
        }

    } catch (error) {
        console.error('❌ Ошибка генерации:', error);
        throw error;
    }
}

// Сохранение изображения в Cloudinary (вместо диска)
async function saveImageToCloudinary(base64Image, requestId) {
    try {
        // Очищаем base64 от префикса data:image/jpeg;base64, если он есть
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        
        console.log('☁️ Загружаем изображение в Cloudinary...');
        
        // Загружаем в Cloudinary
        const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
            public_id: `${requestId}_${Date.now()}`,
            folder: 'floramind',
            format: 'jpg',
            transformation: [
                { quality: 'auto', fetch_format: 'auto' } // Автоматическая оптимизация
            ]
        });
        
        console.log(`✅ Изображение загружено в Cloudinary: ${result.secure_url}`);
        
        // Возвращаем безопасный URL от Cloudinary
        return result.secure_url;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки в Cloudinary:', error);
        
        // Fallback: пробуем сохранить локально если Cloudinary не работает
        try {
            console.log('⚠️ Пробуем сохранить локально как запасной вариант...');
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            const filename = `${requestId}_${Date.now()}.jpg`;
            const filepath = path.join(__dirname, 'public', 'generated', filename);
            
            await fs.ensureDir(path.join(__dirname, 'public', 'generated'));
            await fs.writeFile(filepath, imageBuffer);
            
            console.log(`✅ Изображение сохранено локально: ${filename}`);
            return `${SITE_URL}/generated/${filename}`;
        } catch (fallbackError) {
            console.error('❌ Ошибка локального сохранения:', fallbackError);
            throw error;
        }
    }
}

// Сохранение промпта
app.post('/api/save-prompt', (req, res) => {
    try {
        const { requestId, prompt, orderId } = req.body;
        
        generationRequests.set(requestId, {
            prompt: prompt,
            orderId: orderId,
            status: 'pending',
            timestamp: Date.now()
        });
        
        console.log(`✅ Saved prompt for request ${requestId}`);
        res.json({ success: true, requestId: requestId });
        
    } catch (error) {
        console.error('❌ Error saving prompt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Запуск генерации
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, orderId, requestId } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Промпт обязателен' });
        }

        const genRequestId = requestId || uuidv4();
        
        // Обновляем статус
        if (generationRequests.has(genRequestId)) {
            const request = generationRequests.get(genRequestId);
            request.status = 'processing';
            generationRequests.set(genRequestId, request);
        } else {
            generationRequests.set(genRequestId, {
                prompt,
                orderId,
                status: 'processing',
                timestamp: Date.now()
            });
        }

        // Генерируем изображение
        const imageBase64 = await generateWithYandexART(prompt);
        
        // Сохраняем в Cloudinary (вместо диска)
        const imageUrl = await saveImageToCloudinary(imageBase64, genRequestId);
        
        // Обновляем статус
        const request = generationRequests.get(genRequestId);
        request.status = 'completed';
        request.imageUrl = imageUrl;
        request.completedAt = Date.now();
        generationRequests.set(genRequestId, request);

        // Обновляем статус заказа
        if (orderId) {
            orderStatuses.set(orderId, {
                status: 'completed',
                imageUrl: imageUrl,
                completedAt: Date.now()
            });
        }

        res.json({
            success: true,
            requestId: genRequestId,
            imageUrl: imageUrl,
            orderId: orderId
        });

    } catch (error) {
        console.error('❌ Ошибка генерации:', error);
        
        res.status(500).json({ 
            error: 'Ошибка генерации изображения',
            details: error.message
        });
    }
});

// Проверка статуса генерации
app.get('/api/generation-status/:requestId', (req, res) => {
    try {
        const { requestId } = req.params;
        
        const request = generationRequests.get(requestId);
        
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        if (request.imageUrl) {
            res.json({
                status: 'completed',
                imageUrl: request.imageUrl
            });
        } else {
            res.json({
                status: request.status || 'pending'
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking generation status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Проверка статуса заказа
app.get('/api/check-order/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        
        const orderData = orderStatuses.get(orderId);
        
        if (!orderData) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        if (orderData.imageUrl) {
            res.json({
                status: 'completed',
                imageUrl: orderData.imageUrl
            });
        } else {
            res.json({
                status: 'pending'
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Тестовые эндпоинты
app.get('/api/test-connection', async (req, res) => {
    try {
        const response = await axios.get('https://llm.api.cloud.yandex.net/health', {
            headers: {
                'Authorization': `Api-Key ${YANDEX_API_KEY}`
            },
            timeout: 5000
        });

        res.json({
            success: true,
            message: '✅ Соединение с Yandex Cloud установлено',
            folderId: YANDEX_FOLDER_ID
        });

    } catch (error) {
        res.json({
            success: false,
            message: '❌ Ошибка соединения с Yandex Cloud',
            error: error.message
        });
    }
});

// Новый тестовый эндпоинт для Cloudinary
app.get('/api/test-cloudinary', async (req, res) => {
    try {
        // Пробуем загрузить тестовое изображение
        const testResult = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
            public_id: 'test_' + Date.now(),
            folder: 'floramind_test'
        });
        
        res.json({
            success: true,
            message: '✅ Cloudinary работает',
            testUrl: testResult.secure_url
        });
    } catch (error) {
        res.json({
            success: false,
            message: '❌ Ошибка Cloudinary',
            error: error.message
        });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ 
        status: '✅ FloraAI server is running!',
        yandexIntegration: 'YandexART API',
        cloudinaryIntegration: 'Cloudinary',
        siteUrl: SITE_URL
    });
});

// Очистка старых запросов
setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [id, data] of generationRequests.entries()) {
        if (data.timestamp < oneHourAgo) {
            generationRequests.delete(id);
        }
    }
    
    for (const [id, data] of orderStatuses.entries()) {
        if (data.completedAt && data.completedAt < oneHourAgo) {
            orderStatuses.delete(id);
        }
    }
}, 60 * 60 * 1000);

// Корневой маршрут - отдаем index.html из папки public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`\n🚀 FloraAI server running on http://localhost:${PORT}`);
    console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`📝 Cloudinary test: http://localhost:${PORT}/api/test-cloudinary`);
    console.log(`🔗 YandexART API: ${YANDEX_ART_URL}\n`);
});