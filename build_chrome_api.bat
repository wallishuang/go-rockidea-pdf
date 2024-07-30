windres -o main.syso main.rc
go build -ldflags "-X main.Chrome=true" -o chrome-rockidea-pdf.exe