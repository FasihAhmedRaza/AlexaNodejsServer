import express from "express";
import Alexa , {SkillBuilders} from 'ask-sdk-core';
import morgan from "morgan";
import { ExpressAdapter }from 'ask-sdk-express-adapter'; // jo hamri skills ko add karne me help karee ga
import axios from "axios";
// import * as cheerio from 'cheerio';

const app = express();

app.use(morgan('dev'))
const PORT = process.env.PORT || 3000;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
      const speechText = 'Welcome! In our book club you can get book recommendations, purchase information and book reviews .How can I assist you today?							 ';
  
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
        const prompt = `Give me 3 reviews of the "${bookTitle}" book like a customer. Each review should include the book name, the book author name and  reviewer name with rating, and the review text. (Mix short and long reviews to make them seem like real human or customer reviews.)`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        const formattedReviews = text.split('\n').map((review) => {
            return `
          
            ${review}
            `.trim();
        }).join('\n\n');

        return formattedReviews;
    } catch (error) {
        console.error("Error generating story:", error);
        return "I'm sorry, I couldn't fetch the reviews at the moment. Please try again later.";
    }
}

const BookReviewsHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BookReviews';
    },
    async handle(handlerInput) {
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle.value;

        let story;
        try {
            story = await generateStory(bookTitle);
        } catch (error) {
            console.error("Error in handling the request:", error);
            story = "I'm sorry, I couldn't generate the reviews at the moment. Please try again later.";
        }

        const speechOutput = `
            <speak>
                Here are the reviews for the book titled 
                <emphasis level="moderate">${bookTitle}</emphasis>:
                <break time="1s"/>
                ${story}
            </speak>
        `;

        // Clear session attributes to avoid carrying over data
        handlerInput.attributesManager.setSessionAttributes({});

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('Do you want to ask reviews of another book ?')
            .getResponse();
    }
};

const PurchaseInfoHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PurchaseInfo';
    },
    handle(handlerInput) {
        // Ensure the bookTitle slot is extracted correctly
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle?.value;

        if (!bookTitle) {
            return handlerInput.responseBuilder
                .speak("I'm sorry, I couldn't find the book title. Please tell me the book title you want to purchase.")
                .reprompt("Please provide the name of the book you want to purchase.")
                .getResponse();
        }

        const speechOutput = `You can buy and purchase the book titled "${bookTitle}" from Amazon. It is available on Amazon's website.`;

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
    PurchaseInfoHandler
    
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