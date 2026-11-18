import APIKey
import openai


openai.api_key = APIKey.api_key
openai.Model.list()

image_url = ''

def createImage(image_name):
    global image_url
    response = openai.Image.create(
        prompt=image_name,
        n=1,
        size="256x256"
    )
    image_url = response['data'][0]['url']
    '''urllib.request.urlretrieve(image_url, "../gfg.png")
    img = Image.open("../gfg.png")
    img.show()'''
    return image_url


