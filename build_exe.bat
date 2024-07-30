windres -o main.syso main.rc
go build -ldflags "-X main.Chrome=false" -o rockidea-pdf.exe