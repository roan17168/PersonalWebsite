from tkinter import *
from PIL import Image


def myClick():
    global url
    url = e.get()
    root.destroy()


def start():
    global root
    root = Tk()

    root.iconbitmap('atw1c-6xcfm-001.ico')
    root.title('MVP')

    appWidth = 256
    appHeight = 50

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width) - (appWidth) - 10
    y = (screen_height / 2) - (appHeight / 2)
    root.geometry(f"{appWidth}x{appHeight}+{int(x)}+{int(y)}")
    root.minsize(appWidth, appHeight)
    root.maxsize(appHeight, appHeight)

    global e
    e = Entry(root, width=35, borderwidth=5)
    e.pack()

    myButton = Button(root, text="Enter URL", command=myClick)
    myButton.pack()
    root.mainloop()
    return url




