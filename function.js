// Add axios 0.20.0 as a dependency under Functions Settings, Dependencies
const axios = require('axios')
// Add axios-retry 3.1.9 as a dependency under Functions Settings, Dependencies
const axiosRetry = require('axios-retry')

exports.handler = async function (context, event, callback) {
  
    // Generate an APP API Key from 
    // Customer.io > Integrations > Customer.io > App API and
    // add to Functions Settings > Environment Variables
    let bearer = context.BEARER_TOKEN
    if (bearer == null || bearer == '') {
        return callback('Set your bearer token in environment variables');
    }
    // Generate or use an existing Site ID/API Key pair from 
    // Customer.io > Integrations > Customer.io and
    // add to Functions Settings > Environment Variables
    let trackCreds = context.TRACK_CREDS
    if (trackCreds == null || trackCreds == '') {
        return callback('Set your track API credentials in environment variables');
    }

    try {
        
        // If an axios request returns an error, retry 3 times.
        axiosRetry(axios, {
            retries: 3, // number of retries
            retryCondition: (_error) => true,
            retryDelay: (retryCount) => {
                console.log(`retry attempt: ${retryCount}`)
                return retryCount * 1000; // time interval between retries
            }
        })
        
        // Retrieving the ids of the customer.io profiles that have a 'phone' attribute equal to the phone number that triggered the Twilio flow.
        let customer = await axios.post('https://beta-api.customer.io/v1/api/customers',
            {
                filter: {
                    and: [
                        {
                            attribute: {
                                field: 'phone',
                                operator: 'eq',
                                value: event.from
                            }
                        }
                    ]
                }
            },
            {
                headers: { Authorization: `Bearer ${bearer}` }
            }
        ).catch((error) => {
            throw 'retrieve customer ids -> status: ' + error.response.status
        })
        
        let customer_ids = customer.data.ids
        
        // Setting the 'sms_unsubscribe' attribute on the customer.io profiles to 'true'
        for (let customer_id of customer_ids){
            await axios.put(
                `https://${trackCreds}@track.customer.io/api/v1/customers/${customer_id}`,
                {
                    sms_unsubscribe: true
                }
            ).catch((error) => {
                throw 'update customer profile -> status: ' + error.response.status
            })
        }
        
        //callback() will return status code 200
        return callback(); 
        
    }
    catch(error) {
        console.log('Error Occured -> ' + error)
        return callback(error); 
    }
    
}
