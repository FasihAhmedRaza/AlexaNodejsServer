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


const PurchaseInfoHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PurchaseInfo';
    },
    handle(handlerInput) {
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle?.value;

        // If bookTitle is not provided, ask the user for the book title
        if (!bookTitle) {
            return handlerInput.responseBuilder
                .speak("Which book would you like to get purchase information for?")
                .reprompt("Please tell me the book title you want to get purchase information for.")
                .getResponse();
        }

        const speechOutput = `You can buy the book titled "${bookTitle}" from Amazon. It is available on Amazon's website.`;

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
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'Recommendations';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const bookTitle = sessionAttributes.bookTitle;

        if (!bookTitle) {
            return handlerInput.responseBuilder
                .speak("I need a book title to provide recommendations. Could you please provide the book title again?")
                .reprompt("Please tell me the name of the book.")
                .getResponse();
        }

        let recommendations;
        try {
            recommendations = await getRecommendations(bookTitle); // Replace with your recommendations fetching logic
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            recommendations = "I'm sorry, I couldn't get the recommendations at the moment. Please try again later.";
        }

        const speechOutput = `
            Based on the book titled 
            <emphasis level="moderate">${bookTitle}</emphasis>, 
            I recommend the following books:
            <break time="1s"/>
            ${recommendations}
        `;

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('Do you want to ask about another book?')
            .getResponse();
    }
};



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