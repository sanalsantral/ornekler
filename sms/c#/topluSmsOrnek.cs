string url = "https://api.sanal.link/api/sms/blokGonder";
var request = (HttpWebRequest)WebRequest.Create(url);
string api_key = "xxxxxxxxxxxxxxxxxxxxxxxxxxxx";
string sms_id = "332";
string gidecek_no = "05555555555";
string mesaj = "deneme";

var postData =  "{\"api_key\":\"" + api_key + "\", \"sms_id\":\"" + sms_id + "\", \"bilgiler\": [{\"mesaj\": \"" + mesaj + "\", \"numara\": \"" + gidecek_no + "\"}]}";

var data = Encoding.ASCII.GetBytes(postData);

request.Method = "POST";

            request.ContentType = "application/json";

            request.ContentLength = data.Length;

            using (var stream = request.GetRequestStream())
            {
                stream.Write(data, 0, data.Length);
            }

            var response = (HttpWebResponse)request.GetResponse();

var responseSonuc = new StreamReader(response.GetResponseStream()).ReadToEnd();

MessageBox.Show(responseSonuc);