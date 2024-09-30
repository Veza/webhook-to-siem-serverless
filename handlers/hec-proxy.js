const token = process.env.SPLUNK_TOKEN;
const uri = process.env.HEC_URI;
const sourceType = '_json';
const host = process.env.SOURCE_HOST || 'veza';
const index = process.env.HEC_INDEX || 'main';
const nodeTlsRejectUnauthorized = (process.env.IGNORE_SELF_SIGNED_CERT || 'false').toLowerCase() == 'true' ? 0 : 1;

exports.handler = async (event) => {

  const requestBody = JSON.parse(event.body);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Splunk ${token}`
  };

  const body = {
    event: requestBody,
    sourceType: sourceType,
    host: host,
    index: index
  };

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTlsRejectUnauthorized;

    let res = await fetch(uri, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (res.status == 200) {
      res = await res.json();
      return {
        body: res
      }
    } else {
      return {
        status: res.status,
        body: res.statusText
      }
    }
  } catch (err) {
    console.log(err);
    return {
      statusCode: 400,
      body: err.toString()
    };  
  }

};
