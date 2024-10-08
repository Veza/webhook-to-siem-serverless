
# Send Veza alert and access review action webhooks to SIEM

This [Serverless](https://www.serverless.com/) project provides a proxy app for reformatting Veza webhook messages for various SIEMs. The following SIEMs are currently supported:
1. Splunk

## 1. Splunk
Splunk provides a HTTP Event Collector (HEC), which lets you send data and application events to a Splunk deployment over HTTP and HTTPS. After configuring the HTTP Event Collector on Splunk (Configuraton differs depending on the platform - Refer to the [Splunk Documentation](https://docs.splunk.com/Documentation/SplunkCloud/9.2.2406/Data/UsetheHTTPEventCollector) for configuration steps), you will get the **HTTP Event Collector URL**, which accepts the HTTP POST message. The body of the message is in the format

```
{
  event: {
    kind: "test"
  },
  sourceType: "_json",
  host: "test",
  index: "main"
}
```
* `event` is any object representing the event message that you want to log
* `sourceType` should always be `_json`
* You may populate `host` with a value referring to the source of the message
* Default `index` to `main`, or you can use a different index of your choice.

Sending a Veza webhook message to HEC is as easy as embedding the original message in `event` before sending it in the above format to Splunk. The provided code [hec-proxy.js](./handlers/hec-proxy.js) is a Lambda function that serves this purpose. Follow the below steps to deploy the function to AWS using the [Serverless](https://www.serverless.com/) framework.

### Deploy to AWS

This sample is built using Serverless Framework. Below are steps for deloyment. Alternatively, you may use a framework of your choice (for example, [AWS Serverless Application Model (SAM)](https://aws.amazon.com/serverless/sam/) or build the Lambda manually using the [hec-proxy.js](./handlers/hec-proxy.js) as sample code)

#### Deploy Serverless Framework project

1. **Add environment variables:**
  The serverlsss implementation uses AWS Parameter Store to store values that will be injected into the Lambda's environment variables at deployment time. Create the following Parameters in Parameter Store:  

    | Name | Type | Value |
    | ---- | ---- | ----- |
    | `/hec-proxy/uri` | `String` | The HTTP Event Collector URL to send events to |
    | `/hec-proxy/source-host` | `String` | (optional) This is what you want to populate `host` with in the message. If omitted, it will default to `veza` |
    | `/hec-proxy/index` | `String` | (optional) This is value you want to populate `index` with in the mssage. If omitted, it will default to `main` |
    | `/hec-proxy/ignore-self-signed-cert` | `String` | This is an option to avoid TLS errors. For Splunk Cloud free trial accounts, set this to `true` to temporarily ignore certificate verification, as the cert here is self-signed. In production environments, this should be `false` or unset so that TLS is enabled |

    > ⚠️ The variables stored in Parameter Store above get copied into the Lambda environment variables at deploy time. Changing the values in Parameter Store after deployment will not change the values on the Lambda at runtime. To update the Lambda's environment variables with the latest values in Parameter Store, you must re-deploy.

    ![screenshot](./img/parameter-store.png)


2. **Set up Serverless Framework with AWS**

    If you haven't setup Serverless, follow these steps: 
    * [Install Serverless Framework via NPM](https://www.serverless.com/framework/docs/getting-started#install-the-serverless-framework-via-npm)
    * [Sign In to the Serverless Framework](https://www.serverless.com/framework/docs/getting-started#signing-in)
    * [Configure Serverless with AWS Credentials](https://www.serverless.com/framework/docs/getting-started#setting-up-aws-credentials)


3. **Deploy using serverless**

    After you've used the `serverless` command to set everyting up per step #2 above, deploy by running the following command

    ```
    serverless deploy
    ```

    You should see output similar to the following: 
    ```
    Deploying "webhook-to-siem-sls" to stage "dev" (us-east-1)

    ✔ Service deployed to stack webhook-to-siem-sls-dev (46s)

    endpoint: POST - https://99lj2y8vt5.execute-api.us-east-1.amazonaws.com/log-http-to-splunk
    functions:
      log-http-to-splunk: webhook-to-siem-sls-dev-log-http-to-splunk (2.8 kB)
    ```

## Veza Setup

### 1. Setup an Orchestration Action in Veza

* Navigate to **Integrations > Orchestration Actions** 
* Choose the **Webhook** provider and click *Next*
* Enter the required details:
  | Field | Description | Example |
  | ----- | ----------- | ------- |
  | Name  | Provide a name for the Orchestration Action | `Splunk HEC` |
  | URL   | The POST endpoint of the deployed service (see example output from above) | `https://99lj2y8vt5.execute-api.us-east-1.amazonaws.com/log-http-to-splunk` |
  | Authentication | Choose `Token` | `Token` |
  | Authorization Token | Enter the Splunk token to authenticate the HTTP Event Collector URL | `c7636d11-2719-4ae8-3329-938acd2b8763` |

### 2. Add a Webhook to a rule:
Webhooks can be attached to rules by opening the *rule builder*, accessed from the **Access Intelligence** > *Rules & Alerts*, or from **Access Search** > *Saved Queries*.
* From *Rules*, edit an existing rule or create a new one to open the rule builder
* From the *Saved Queries* list, choose "Create a Rule" from the actions list
* On the Edit Rule screen, **Action** tab, select *Deliver Alert via Webhook/Email* and set an existing webhook

