package com.areli.api;

import com.areli.api.ai.AiProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AiProperties.class)
public class AreliApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(AreliApiApplication.class, args);
	}

}
