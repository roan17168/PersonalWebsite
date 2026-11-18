import urllib.request
from PIL import Image, ImageTk
import tkinter as tk
from io import BytesIO
import Loop

click = False
click1 = False
artist = ""
style = ""
type = 0

running = True

def myClick1():
    global click
    if click == False:
        f = open("LikedImages.txt", "a")
        f.write(f"\n{imName}: {imUrl}")
        click = True
    else:
        pass


def myClick2():
    global click1
    if click1 == False:
        if type == 1:
            deleteLine("Style.txt", style)
        if type == 2:
            deleteLine("Artist.txt", artist)
        click1 = True
    else:
        pass


def myClick3():
    Loop.Loop = True
    root.destroy()



def start(url, image_name):
    global root
    global imUrl
    global imName

    imUrl = url
    imName = image_name

    root = tk.Tk()
    root.title('MVP')
    root.iconbitmap('atw1c-6xcfm-001.ico')

    appWidth = 256
    appHeight = 256

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width) - (appWidth) - 10
    y = (screen_height / 2) - (appHeight / 2)
    root.geometry(f"{appWidth}x{appHeight}+{int(x)}+{int(y)}")

    root.minsize(appWidth, appHeight)
    root.maxsize(appWidth, appHeight)

    u = urllib.request.urlopen(url)
    raw_data = u.read()
    u.close()
    im = Image.open(BytesIO(raw_data))
    image = ImageTk.PhotoImage(im)
    picture = tk.Label(image=image)
    picture.place(x=0, y=0)

    label = tk.Label(root, text="This is a image of: " + image_name, padx=0, pady=0, fg="white", bg="black",
                     wraplength=256, font=('times', 9, 'bold'))
    label.pack()
    likeButton = tk.Button(root, text="Save", padx=0, pady=0, fg="black", bg="green", font=('times', 9, 'bold'),
                           command=myClick1)
    likeButton.place(relx=0.3, rely=0.97, anchor='center')
    dislikeButton = tk.Button(root, text="Remove", padx=0, pady=0, fg="black", bg="red", font=('times', 9, 'bold'),
                           command=myClick2)
    dislikeButton.place(relx=0.5, rely=0.97, anchor='center')
    againButton = tk.Button(root, text="Again", padx=0, pady=0, fg="black", bg="white", font=('times', 9, 'bold'),
                              command=myClick3)
    againButton.place(relx=0.7, rely=0.97, anchor='center')

    root.mainloop()

def deleteLine(file, lineWords):
    try:
        with open(file, 'r') as fr:
            lines = fr.readlines()

            with open(file, 'w') as fw:
                for line in lines:

                    # strip() is used to remove '\n'
                    # present at the end of each line
                    if line.strip('\n') != lineWords:
                        fw.write(line)

        f = open("Deleted.txt", "a")
        f.write(f"\n{lineWords}")

    except:
        print("Oops! something error")
