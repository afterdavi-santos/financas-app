package com.financas.app.security;

import com.financas.app.model.Usuario;
import com.financas.app.repository.UsuarioRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length());
            try {
                Long usuarioId = jwtService.extrairUsuarioId(token);
                Optional<Usuario> usuario = usuarioRepository.findById(usuarioId);
                if (usuario.isPresent() && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UsuarioAutenticado usuarioAutenticado = new UsuarioAutenticado(usuario.get());
                    var authentication = new UsernamePasswordAuthenticationToken(
                            usuarioAutenticado, null, usuarioAutenticado.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                // token inválido/expirado: segue sem autenticar, Spring Security barra o acesso
            }
        }
        filterChain.doFilter(request, response);
    }

}
