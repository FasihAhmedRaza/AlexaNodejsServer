import express from "express";
import Alexa , {SkillBuilders} from 'ask-sdk-core';
import morgan from "morgan";
import { ExpressAdapter }from 'ask-sdk-express-adapter'; // jo hamri skills ko add karne me help karee ga
import axios from "axios";
// import * as cheerio from 'cheerio';
const Gooogle_API_KEY = 'AIzaSyC8F2eVsbZaawLxkGr5FiAaxEDB-p44U3A';

const app = express();

app.use(morgan('dev'))
const PORT = process.env.PORT || 3000;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
      const speechText = 'Welcome to our Virtual Book Center where you can get book recommendations, book purchase information and book reviews. How can I assist you today? ';
  
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('Hello World', speechText)
        .getResponse();
    },
  };

  import { GoogleGenerativeAI } from "@google/generative-ai";

  const API_KEY = 'AIzaSyBfBzPQ7iiNPjtdp0nz3oJJzqizE6t2reg';
  // Access your API key as an environment variable
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  async function generateStory(bookTitle) {
    try {
        const prompt = `Give me 3 reviews of the "${bookTitle}" book like a customer. Each review should include the book name, the book author name, and reviewer name with rating, and the review text. (Mix short and long reviews to make them seem like real human or customer reviews. )`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        // Remove hashtags from the reviews
        const cleanedText = text.replace(/##/g, ' ').replace(/\*\*/g, ' ');
        // Format the reviews
        const formattedReviews = cleanedText.split('\n').map((review) => {
            return `${review}`.trim();
        }).join('\n\n');

        return formattedReviews;
    } catch (error) {
        console.error("Error generating story:", error);
        return "I'm sorry, I couldn't fetch the reviews at the moment. Please try again later.";
    }
}


const BookQueryHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BookQuery';
    },
    handle(handlerInput) {
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle.value;

        if (!bookTitle) {
            return handlerInput.responseBuilder
                .speak("Please tell me the name of the book you want to ask about.")
                .reprompt("What is the name of the book?")
                .getResponse();
        }

        const speechOutput = `
            You've mentioned the book titled 
            <emphasis level="moderate">${bookTitle}</emphasis>. 
            Would you like to hear reviews, get purchase information, or get recommendations?
        `;

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.bookTitle = bookTitle;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt("Please tell me if you want reviews, purchase information, or recommendations.")
            .getResponse();
    }
};

const BookReviewsHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BookReviews';
    },
    async handle(handlerInput) {
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle.value;

        let reviews;
        try {
            reviews = await generateStory(bookTitle); // Replace with your reviews fetching logic
        } catch (error) {
            console.error("Error fetching reviews:", error);
            reviews = "I'm sorry, I couldn't get the reviews at the moment. Please try again later.";
        }

        const speechOutput = `
            <speak>
                Here are the reviews for the book titled 
                <emphasis level="moderate">${bookTitle}</emphasis>:
                
                ${reviews}
            </speak>
        `;

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('Do you want to ask about another book?')
            .getResponse();
    }
};

async function fetchAuthor(bookTitle) {
    try {
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookTitle)}&key=${Gooogle_API_KEY}`);
        const book = response.data.items[0];
        return book.volumeInfo.authors[0]; // Assume the first author is the main author
    } catch (error) {
        console.error("Error fetching author from Google Books API:", error);
        return null;
    }
}

const PurchaseInfoHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PurchaseInfo';
    },
    async handle(handlerInput) {
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle?.value;

        if (!bookTitle) {
            return handlerInput.responseBuilder
                .speak("Which book would you like to get purchase information for?")
                .reprompt("Please tell me the book title you want to get purchase information for.")
                .getResponse();
        }

        // Fetch the author name
        const authorName = await fetchAuthor(bookTitle);

        if (!authorName) {
            return handlerInput.responseBuilder
                .speak("I'm sorry, I couldn't find the author for the book you mentioned. Please try again with a different title.")
                .getResponse();
        }

        // Fetch approximate price range from Gemini API
        let priceRange;
        try {
            const prompt = `Provide an approximate price range for the book titled "${bookTitle}" written by ${authorName} in USD. Please ensure the price range is clearly mentioned in the response.`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();
            
            // Log the full response for troubleshooting
            console.log("Full response from Gemini API:", text);
            
            // Adjusting extraction logic based on the full response
            const priceMatch = text.match(/(?:\$|USD)\s*[\d,.]+\s*(?:to|-)\s*(?:\$|USD)\s*[\d,.]+/i) || text.match(/(?:\$|USD)\s*[\d,.]+/i);
            priceRange = priceMatch ? priceMatch[0] : "unavailable";

        } catch (error) {
            console.error("Error fetching price range from Gemini API:", error);
            priceRange = "unavailable";
        }

        const speechOutput = `You can buy the book titled "${bookTitle}" by ${authorName} from Amazon. It is available on Amazon's website for an approximate price range of ${priceRange}.`;

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('Do you want to know where you can buy or get reviews for another book?')
            .getResponse();
    }
};




// Adding a fallback handler to manage unrecognized intents or errors
// const FallbackHandler = {
//     canHandle(handlerInput) {
//         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
//     },
//     handle(handlerInput) {
//         const speechOutput = "I'm sorry, I didn't quite understand that. Could you please repeat?";
//         return handlerInput.responseBuilder
//             .speak(speechOutput)
//             .reprompt(speechOutput)
//             .getResponse();
//     }
// };

const RecommendationsHandler = {
    canHandle(handlerInput) {
        console.log("Checking if GenreRecommendationHandler can handle the request...");
        const canHandle = Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'Recommendations';
        console.log("Can Handle:", canHandle);
        return canHandle;
    },
    async handle(handlerInput) {
        console.log("GenreRecommendationHandler is handling the request...");
        const genre = handlerInput.requestEnvelope.request.intent.slots.genre.value;
        console.log("Genre received:", genre);

        if (!genre) {
            console.log("No genre provided.");
            return handlerInput.responseBuilder
                .speak("Please specify a genre for the book recommendations.")
                .reprompt("What genre would you like to get book recommendations for?")
                .getResponse();
        }

        let recommendations;
        try {
            console.log("Fetching recommendations for genre:", genre);
            recommendations = await getGenreRecommendations(genre);
            console.log("Recommendations fetched:", recommendations);
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            recommendations = "I'm sorry, I couldn't get the recommendations at the moment. Please try again later.";
        }

        const speechOutput = recommendations 
            ? `Based on your interest in <emphasis level="moderate">${genre}</emphasis>, here are some top-rated books: ${recommendations}`
            : "I couldn't find any recommendations for that genre. Please try a different genre.";

        console.log("Speech Output:", speechOutput);

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('Would you like recommendations for another genre?')
            .getResponse();
    }
};

async function getGenreRecommendations(genre) {
    console.log("Making API call to fetch books for genre:", genre);
    try {
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&key=${Gooogle_API_KEY}`);

        console.log("API Response:", response.data);
        const books = response.data.items ? response.data.items.slice(0, 3) : [];
        console.log("Books fetched from API:", books);

        if (books.length === 0) {
            return null;
        }

        return books.map(book => `${book.volumeInfo.title} by ${book.volumeInfo.authors.join(', ')}`).join('<break time="0.5s"/>');
    } catch (error) {
        console.error("Error in API call:", error);
        throw error;
    }
}




const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const skillBuilder = SkillBuilders.custom()
.addRequestHandlers(
    LaunchRequestHandler,
    // SayNameHandler
    BookReviewsHandler,
    // FallbackHandler,
    PurchaseInfoHandler,
    BookQueryHandler,
    RecommendationsHandler
    
)
.addErrorHandlers(
    ErrorHandler
)

const skill = skillBuilder.create();

const adapter = new ExpressAdapter(skill ,false, false);

app.post('/api/v1/webhook-alexa' , adapter.getRequestHandlers());

app.use(express.json())

app.listen(PORT , () => {
    console.log(`Server is running on port ${PORT}`);
});