string url = "https://api.sanal.link/api/sms/gonder";
var request = (HttpWebRequest)WebRequest.Create(url);
string api_key = "n5EITLJF5lPrg5wDqpoCGwyI2UVh";
string sms_id = "332";
string gidecek_no = "05555555555";
string mesaj = "deneme";

var postData = "api_key=" + api_key + "&sms_id=" + sms_id + "&gidecek_no=" + gidecek_no + "&mesaj=" + mesaj + "";

var data = Encoding.ASCII.GetBytes(postData);

request.Method = "POST";

            request.ContentType = "application/x-www-form-urlencoded";

            request.ContentLength = data.Length;

            using (var stream = request.GetRequestStream())
            {
                stream.Write(data, 0, data.Length);
            }

            var response = (HttpWebResponse)request.GetResponse();

var responseSonuc = new StreamReader(response.GetResponseStream()).ReadToEnd();

MessageBox.Show(responseSonuc);