# Slim APK toolchain: JDK 17, Node 20, Android SDK 36, Gradle. No NDK/emulator.
FROM eclipse-temurin:17-jdk-jammy

ARG NODE_VERSION=20.19.4
ARG GRADLE_VERSION=8.14.3
ARG CMDLINE_TOOLS=11076708

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV GRADLE_HOME=/opt/gradle
ENV PATH=${GRADLE_HOME}/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl unzip python3 xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
  && mkdir -p ${ANDROID_HOME}/cmdline-tools \
  && curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS}_latest.zip" -o /tmp/cmd.zip \
  && unzip -q /tmp/cmd.zip -d ${ANDROID_HOME}/cmdline-tools \
  && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
  && rm /tmp/cmd.zip \
  && yes | sdkmanager --sdk_root=${ANDROID_HOME} --licenses >/dev/null \
  && sdkmanager --sdk_root=${ANDROID_HOME} "platforms;android-36" "build-tools;36.0.0" "platform-tools" \
  && curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" -o /tmp/gradle.zip \
  && unzip -q /tmp/gradle.zip -d /opt \
  && mv /opt/gradle-${GRADLE_VERSION} ${GRADLE_HOME} \
  && rm /tmp/gradle.zip \
  && rm -rf ${ANDROID_HOME}/.android /root/.android

WORKDIR /project/client
