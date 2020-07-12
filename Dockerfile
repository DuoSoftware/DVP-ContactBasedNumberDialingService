#FROM ubuntu
#RUN apt-get update
#RUN apt-get install -y git nodejs npm nodejs-legacy
#RUN git clone git://github.com/DuoSoftware/DVP-UserService.git /usr/local/src/userservice
#RUN cd /usr/local/src/userservice; npm install
#CMD ["nodejs", "/usr/local/src/userservice/app.js"]

#EXPOSE 8842

# FROM node:9.9.0
# ARG VERSION_TAG
# RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-ContactBasedNumberDialingService.git /usr/local/src/contactbasednumberdialingservice
# RUN cd /usr/local/src/contactbasednumberdialingservice;
# WORKDIR /usr/local/src/contactbasednumberdialingservice
# RUN npm install
# EXPOSE 8899
# CMD [ "node", "/usr/local/src/contactbasednumberdialingservice/app.js" ]

FROM node:10-alpine
WORKDIR /usr/local/src/cbdialingservice
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8899
CMD [ "node", "app.js" ]
