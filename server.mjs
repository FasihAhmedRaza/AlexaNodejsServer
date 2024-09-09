import express from "express";
import Alexa , {SkillBuilders} from 'ask-sdk-core';
import morgan from "morgan";
import { ExpressAdapter }from 'ask-sdk-express-adapter'; // jo hamri skills ko add karne me help karee ga
import axios from "axios";
import pkg from 'ask-sdk-model';
const { services: { monetization: { MonetizationServiceClient } } } = pkg;

// import * as cheerio from 'cheerio';
const Gooogle_API_KEY = 'AIzaSyC8F2eVsbZaawLxkGr5FiAaxEDB-p44U3A';

const app = express();

app.use(morgan('dev'))
const PORT = process.env.PORT || 3000;

// SKILL PURCHASE CODE START 
const InSkillProductHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ProductInfoIntent';
    },
    async handle(handlerInput) {
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const msClient = new MonetizationServiceClient();
        let productResponse;

        try {
            productResponse = await msClient.getInSkillProducts(handlerInput.serviceClientFactory.getMonetizationServiceClient(), locale);
        } catch (error) {
            console.error('Error retrieving product information', error);
            return handlerInput.responseBuilder
                .speak('There was an error retrieving the product information. Please try again later.')
                .getResponse();
        }

        const entitledProducts = productResponse.inSkillProducts.filter(record => record.entitled === 'ENTITLED');
        const entitledProductNames = entitledProducts.map(product => product.name).join(', ');

        if (entitledProducts.length > 0) {
            return handlerInput.responseBuilder
                .speak(`You currently have access to the following products: ${entitledProductNames}. Would you like to learn more about other products or purchase a subscription?`)
                .reprompt('Would you like to learn more about other products or purchase a subscription?')
                .getResponse();
        } else {
            return handlerInput.responseBuilder
                .speak('It looks like you do not have any active subscriptions. Would you like to learn about the subscription options available?')
                .reprompt('Would you like to learn about the subscription options available?')
                .getResponse();
        }
    }
};

const BuySubscriptionHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BuySubscriptionIntent';
    },
    async handle(handlerInput) {
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const msClient = new MonetizationServiceClient();
        let productResponse;

        try {
            productResponse = await msClient.getInSkillProducts(handlerInput.serviceClientFactory.getMonetizationServiceClient(), locale);
        } catch (error) {
            console.error('Error retrieving product information', error);
            return handlerInput.responseBuilder
                .speak('There was an error retrieving the product information. Please try again later.')
                .getResponse();
        }

        const subscriptionProduct = productResponse.inSkillProducts.find(record => record.referenceName === 'YOUR_SUBSCRIPTION_PRODUCT_REFERENCE_NAME');

        if (subscriptionProduct) {
            return handlerInput.responseBuilder
                .addDirective({
                    type: 'Connections.SendRequest',
                    name: 'Buy',
                    payload: {
                        InSkillProduct: {
                            productId: subscriptionProduct.productId
                        }
                    },
                    token: 'correlationToken'
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak('There are no available subscriptions at the moment. Please try again later.')
            .getResponse();
    }
};

const CancelSubscriptionHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CancelSubscriptionIntent';
    },
    async handle(handlerInput) {
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const msClient = new MonetizationServiceClient();
        let productResponse;

        try {
            productResponse = await msClient.getInSkillProducts(handlerInput.serviceClientFactory.getMonetizationServiceClient(), locale);
        } catch (error) {
            console.error('Error retrieving product information', error);
            return handlerInput.responseBuilder
                .speak('There was an error retrieving the product information. Please try again later.')
                .getResponse();
        }

        const subscriptionProduct = productResponse.inSkillProducts.find(record => record.referenceName === 'YOUR_SUBSCRIPTION_PRODUCT_REFERENCE_NAME');

        if (subscriptionProduct) {
            return handlerInput.responseBuilder
                .addDirective({
                    type: 'Connections.SendRequest',
                    name: 'Cancel',
                    payload: {
                        InSkillProduct: {
                            productId: subscriptionProduct.productId
                        }
                    },
                    token: 'correlationToken'
                })
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak('There are no subscriptions to cancel at the moment.')
            .getResponse();
    }
};



// SKILL PURCHASE CODE END




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
                .speak("Got it! Which book would you like to hear reviews for?")
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
        const bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle?.value;

        if (!bookTitle) {
            return handlerInput.responseBuilder
                .speak("Got it! Which book would you like to hear reviews for?”")
                .reprompt("Please tell me the book title you'd like information on.")
                .getResponse();
        }

        let reviews;
        try {
            reviews = await generateStory(bookTitle); // Replace with your reviews fetching logic

            if (!reviews || reviews.trim() === "") {
                reviews = "It seems that there are no reviews available for this book at the moment.";
            }
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
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let bookTitle = handlerInput.requestEnvelope.request.intent.slots.bookTitle?.value;

        // Check if book title is provided or not
        if (!bookTitle) {
            sessionAttributes.awaitingBookTitle = true;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak("Which book would you like to get purchase information for?")
                .reprompt("Please tell me the book title you want to get purchase information for.")
                .getResponse();
        }

        // If book title was previously missing, but provided now, reset awaiting flag
        if (sessionAttributes.awaitingBookTitle) {
            delete sessionAttributes.awaitingBookTitle;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        }

        // Fetch the author name
        const authorName = await fetchAuthor(bookTitle);

        if (!authorName) {
            return handlerInput.responseBuilder
                .speak("I'm sorry, I couldn't find the author for the book you mentioned. Please try again with a different title.")
                .reprompt("Please tell me the book title you want to get purchase information for.")
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
            priceRange = priceMatch ? priceMatch[0] : null;

        } catch (error) {
            console.error("Error fetching price range from Gemini API:", error);
            priceRange = null;
        }

        // Handle unavailable price information or book not in sale
        if (!priceRange) {
            return handlerInput.responseBuilder
                .speak("I'm sorry, but the price information for this book is currently unavailable. Let me know if there's another book you'd like to get purchase information for.")
                .reprompt("Please tell me the book title you want to get purchase information for.")
                .getResponse();
        }

        const speechOutput = `You can buy the book titled "${bookTitle}" by ${authorName} from Amazon. It is available on Amazon's website for an approximate price range of ${priceRange}.`;

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('Do you want to know where you can buy or get reviews for another book?')
            .getResponse();
    }
};




const RecommendationsHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'Recommendations';
    },
    async handle(handlerInput) {
        const genre = handlerInput.requestEnvelope.request.intent.slots.genre?.value;

        if (!genre) {
            // If the user didn't provide a genre, prompt them to do so
            return handlerInput.responseBuilder
                .speak("Sure! What type of book are you in the mood for? Just let me know the genre, and I’ll find something great for you!?")
                .reprompt("What genre would you like to get book recommendations for?")
                .getResponse();
        }

        let recommendations;
        try {
            recommendations = await getGenreRecommendations(genre);
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            recommendations = "I'm sorry, I couldn't get the recommendations at the moment. Please try again later.";
        }

        const speechOutput = recommendations 
            ? `Based on your interest in <emphasis level="moderate">${genre}</emphasis>, here are some top-rated books: ${recommendations}`
            : "I couldn't find any recommendations for that genre. Please try a different genre.";

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
        let books = response.data.items ? response.data.items : [];
        console.log("Books fetched from API:", books);

        if (books.length === 0) {
            return null;
        }

        // Shuffle books to ensure randomness
        books = shuffleArray(books);

        // Select a random subset of books
        const selectedBooks = books.slice(0, 3);

        return selectedBooks.map(book => `${book.volumeInfo.title} by ${book.volumeInfo.authors.join(', ')}`).join('<break time="0.5s"/>');
    } catch (error) {
        console.error("Error in API call:", error);
        throw error;
    }
}

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}



const ExitSkillIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ExitSkillIntent';
    },
    handle(handlerInput) {
        const speechText = 'Alright, closing the Virtual Book Center. Come back soon for more book discoveries!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true) // This ends the session
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
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Alright, closing the Virtual Book Center. Come back soon for more book discoveries!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

// Function to get in-skill products and handle errors
async function getSubscriptionStatus(handlerInput) {
  const locale = handlerInput.requestEnvelope.request.locale;
  const monetizationServiceClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

  try {
    // Fetch in-skill products
    const result = await monetizationServiceClient.getInSkillProducts(locale);

    // Process the subscription information (e.g., check for active subscriptions)
    const inSkillProducts = result.inSkillProducts;
    const activeSubscriptions = inSkillProducts.filter(product => product.entitled === 'ENTITLED');

    // Logging for debugging
    console.log('Active Subscriptions:', activeSubscriptions);

    // Return the active subscriptions or any other required information
    return activeSubscriptions;

  } catch (error) {
    console.error('Error checking subscriptions:', error);

    // Check if error is a ServiceError and if it is an Internal Server Error
    if (error instanceof ServiceError && error.statusCode === 500) {
      console.error('Internal Server Error occurred. Retrying...');

      // Implement a retry mechanism with a short delay
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const retryResult = await monetizationServiceClient.getInSkillProducts(locale);
            const retryInSkillProducts = retryResult.inSkillProducts;
            const retryActiveSubscriptions = retryInSkillProducts.filter(product => product.entitled === 'ENTITLED');

            // Log the retry result
            console.log('Retry Active Subscriptions:', retryActiveSubscriptions);

            resolve(retryActiveSubscriptions);
          } catch (retryError) {
            console.error('Retry failed:', retryError);
            reject(retryError);
          }
        }, 1000); // Retry after 1 second
      });

    } else {
      // Handle other types of errors or unexpected conditions
      console.error('Unexpected error checking subscriptions:', error);
      throw error;  // Re-throw the error for further handling if necessary
    }
  }
}

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

// Example of using the function in a handler
const CheckSubscriptionHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckSubscription';
  },
  async handle(handlerInput) {
    try {
      const activeSubscriptions = await getSubscriptionStatus(handlerInput);
      
      let speechText;
      if (activeSubscriptions.length > 0) {
        speechText = `You have the following active subscriptions: ${activeSubscriptions.map(sub => sub.name).join(', ')}.`;
      } else {
        speechText = 'You do not have any active subscriptions.';
      }

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();

    } catch (error) {
      // Handle the error gracefully and provide a user-friendly response
      console.error('Error in LaunchRequestHandler:', error);
      return handlerInput.responseBuilder
        .speak('Sorry, there was a problem checking your subscriptions. Please try again later.')
        .getResponse();
    }
  },
};


const skillBuilder = SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CancelAndStopIntentHandler,
        BookReviewsHandler,
        PurchaseInfoHandler,
        BookQueryHandler,
        RecommendationsHandler,
        ExitSkillIntentHandler ,
        CheckSubscriptionHandler,
        InSkillProductHandler,
        BuySubscriptionHandler,
        CancelSubscriptionHandler,
        HelloWorldIntentHandler

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